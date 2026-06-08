import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, CheckCircle2, XCircle, Send, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-blue-100 text-blue-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

const APPROVAL_COLORS = {
  "Not Required": "bg-slate-50 text-slate-400",
  Pending: "bg-amber-50 text-amber-600",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-600",
};

function validateOrder(items) {
  const errors = [];
  const contractual = items.filter(i => i.item_type === 'Contractual');
  const extras = items.filter(i => i.item_type === 'Extra Charge');

  contractual.forEach((item, idx) => {
    if (!item.contract_catalogue_item_id) errors.push(`Line ${idx + 1}: Missing FMPI catalogue reference`);
    if (!item.contract_unit_rate && item.contract_unit_rate !== 0) errors.push(`Line ${idx + 1}: Missing contract unit price`);
  });

  extras.forEach((item, idx) => {
    if (!item.extra_charge_code) errors.push(`Extra charge ${idx + 1}: Missing extra charge code`);
    if (!item.justification?.trim()) errors.push(`Extra charge ${idx + 1}: Justification is required`);
    if (item.approval_status === 'Pending') errors.push(`Extra charge ${idx + 1}: Approval is pending`);
  });

  if (items.some(i => i.manual_unit_rate && i.approval_status !== 'Approved')) {
    errors.push('Manual price override on one or more lines requires approval before submission');
  }

  return errors;
}

export default function PricingOrderView({ pricingOrderId, incidentId, workOrderId, onPricingOrderCreated }) {
  const queryClient = useQueryClient();
  const [showAddContractual, setShowAddContractual] = useState(false);
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [newContractual, setNewContractual] = useState({ catalogue_id: '', actual_quantity: 1 });
  const [newExtra, setNewExtra] = useState({ extra_charge_type_id: '', actual_quantity: 1, manual_unit_rate: '', justification: '' });

  // Auto-create pricing order if incidentId and workOrderId provided but no pricingOrderId
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['pricingOrder', pricingOrderId || ['auto', incidentId, workOrderId]],
    queryFn: async () => {
      if (pricingOrderId) {
        const results = await base44.entities.PricingOrders.filter({ id: pricingOrderId });
        return results[0];
      } else if (incidentId && workOrderId) {
        // Try to find existing or create new
        const existing = await base44.entities.PricingOrders.filter({ incident_id: incidentId, work_order_id: workOrderId });
        if (existing.length > 0) return existing[0];
        // Create new
        const ref = `PO-${Date.now().toString(36).toUpperCase()}`;
        const order = await base44.entities.PricingOrders.create({
          pricing_order_ref: ref,
          incident_id: incidentId,
          work_order_id: workOrderId,
          contract_version: 'v1.0-2024',
          status: 'Draft',
          contractual_total: 0,
          extra_charges_total: 0,
          grand_total: 0,
        });
        if (onPricingOrderCreated) onPricingOrderCreated(order.id);
        return order;
      }
      return null;
    },
    enabled: !!pricingOrderId || (!pricingOrderId && incidentId && workOrderId),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['pricingOrderItems', order?.id || 'pending'],
    queryFn: () => order?.id ? base44.entities.PricingOrderItems.filter({ pricing_order_id: order.id }) : Promise.resolve([]),
    enabled: !!order?.id,
  });

  const { data: catalogue = [] } = useQuery({
    queryKey: ['fmpiCatalogue'],
    queryFn: () => base44.entities.FMPIContractCatalogue.filter({ is_active: true }, 'child_line_code', 500),
  });

  const { data: extraChargeTypes = [] } = useQuery({
    queryKey: ['fmpiExtraChargeTypes'],
    queryFn: () => base44.entities.FMPIExtraChargeTypes.filter({ is_active: true }, 'sort_order', 50),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pricingOrder', order?.id] });
    queryClient.invalidateQueries({ queryKey: ['pricingOrderItems', order?.id] });
  };

  const recalcTotals = async (allItems) => {
    if (!order?.id) return;
    const contractual_total = allItems.filter(i => i.item_type === 'Contractual').reduce((s, i) => s + (i.total_amount || 0), 0);
    const extra_charges_total = allItems.filter(i => i.item_type === 'Extra Charge').reduce((s, i) => s + (i.total_amount || 0), 0);
    const grand_total = contractual_total + extra_charges_total;
    await base44.entities.PricingOrders.update(order.id, { contractual_total, extra_charges_total, grand_total });
  };

  const addContractualMutation = useMutation({
    mutationFn: async () => {
      if (!order?.id) throw new Error('Pricing order not initialized');
      const catItem = catalogue.find(c => c.id === newContractual.catalogue_id);
      if (!catItem) throw new Error('Select a valid catalogue item');
      const finalRate = catItem.contract_unit_price || 0;
      const qty = Number(newContractual.actual_quantity) || 1;
      const total = qty * finalRate;
      const item = await base44.entities.PricingOrderItems.create({
        pricing_order_id: order.id,
        item_type: 'Contractual',
        parent_fmpi_code: catItem.parent_fmpi_code,
        child_line_code: catItem.child_line_code,
        contract_catalogue_item_id: catItem.id,
        description: catItem.description,
        unit_of_measure: catItem.unit_of_measure,
        default_quantity: catItem.default_quantity,
        actual_quantity: qty,
        contract_unit_rate: finalRate,
        final_unit_rate: finalRate,
        total_amount: total,
        is_extra_charge: false,
        approval_status: 'Not Required',
        contract_version: catItem.contract_version,
        source_contract_reference: `FMPI ${catItem.contract_version} / ${catItem.child_line_code}`,
      });
      const newItems = [...items, item];
      await recalcTotals(newItems);
    },
    onSuccess: () => { invalidate(); setShowAddContractual(false); setNewContractual({ catalogue_id: '', actual_quantity: 1 }); toast.success('Item added'); },
    onError: (e) => toast.error(e.message),
  });

  const addExtraMutation = useMutation({
    mutationFn: async () => {
      if (!order?.id) throw new Error('Pricing order not initialized');
      const ecType = extraChargeTypes.find(e => e.id === newExtra.extra_charge_type_id);
      if (!ecType) throw new Error('Select an extra charge type');
      if (!newExtra.justification?.trim()) throw new Error('Justification is required for extra charges');
      const rate = Number(newExtra.manual_unit_rate) || ecType.default_rate || 0;
      const qty = Number(newExtra.actual_quantity) || 1;
      const total = qty * rate;
      const item = await base44.entities.PricingOrderItems.create({
        pricing_order_id: order.id,
        item_type: 'Extra Charge',
        extra_charge_type_id: ecType.id,
        extra_charge_code: ecType.extra_charge_code,
        description: ecType.display_name,
        unit_of_measure: ecType.default_unit,
        actual_quantity: qty,
        manual_unit_rate: rate,
        final_unit_rate: rate,
        total_amount: total,
        is_extra_charge: true,
        justification: newExtra.justification,
        approval_status: ecType.requires_approval ? 'Pending' : 'Not Required',
      });
      const newItems = [...items, item];
      await recalcTotals(newItems);
    },
    onSuccess: () => { invalidate(); setShowAddExtra(false); setNewExtra({ extra_charge_type_id: '', actual_quantity: 1, manual_unit_rate: '', justification: '' }); toast.success('Extra charge added'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.PricingOrderItems.delete(itemId);
      const remaining = items.filter(i => i.id !== itemId);
      await recalcTotals(remaining);
    },
    onSuccess: () => { invalidate(); toast.success('Item removed'); },
  });

  const approveItemMutation = useMutation({
    mutationFn: async ({ itemId, status }) => {
      await base44.entities.PricingOrderItems.update(itemId, { approval_status: status, approved_at: new Date().toISOString() });
      await recalcTotals(items);
    },
    onSuccess: () => { invalidate(); toast.success('Item approval updated'); },
  });

  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order?.id) throw new Error('Pricing order not initialized');
      const errors = validateOrder(items);
      if (errors.length > 0) throw new Error(errors.join('\n'));
      await base44.entities.PricingOrders.update(order.id, {
        status: 'Submitted',
        submitted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => { invalidate(); toast.success('Pricing Order submitted for approval'); },
    onError: (e) => toast.error(e.message),
  });

  const approveOrderMutation = useMutation({
    mutationFn: (status) => {
      if (!order?.id) throw new Error('Pricing order not initialized');
      return base44.entities.PricingOrders.update(order.id, {
        status: status === 'approve' ? 'Approved' : 'Rejected',
        approved_at: new Date().toISOString(),
      });
    },
    onSuccess: () => { invalidate(); toast.success('Pricing Order updated'); },
  });

  const contractualItems = items.filter(i => i.item_type === 'Contractual').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const extraItems = items.filter(i => i.item_type === 'Extra Charge').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const contractualTotal = order?.contractual_total || 0;
  const extraTotal = order?.extra_charges_total || 0;
  const grandTotal = order?.grand_total || 0;

  if (orderLoading || itemsLoading) {
    return <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading Pricing Order...</div>;
  }

  const canEdit = !order || order.status === 'Draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      {order && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">{order.pricing_order_ref || 'Pricing Order'}</h3>
              <p className="text-xs text-slate-500">Contract version: {order.contract_version || '—'}</p>
            </div>
            <Badge className={STATUS_COLORS[order.status] || 'bg-slate-100'}>{order.status}</Badge>
          </div>
          <div className="flex gap-2">
            {order.status === 'Draft' && (
              <Button onClick={() => submitOrderMutation.mutate()} disabled={submitOrderMutation.isPending} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                {submitOrderMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit for Approval
              </Button>
            )}
            {order.status === 'Submitted' && (
              <>
                <Button onClick={() => approveOrderMutation.mutate('approve')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button onClick={() => approveOrderMutation.mutate('reject')} size="sm" variant="outline" className="text-red-600 border-red-300 gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION A: Contractual FMPI Items ─── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">A</span>
            <h4 className="text-sm font-bold text-indigo-900">Contractual FMPI Items</h4>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setShowAddContractual(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Add Item
            </Button>
          )}
        </div>

        {showAddContractual && (
          <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1 block">FMPI Catalogue Item *</label>
                <Select value={newContractual.catalogue_id} onValueChange={v => setNewContractual(p => ({ ...p, catalogue_id: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select catalogue item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogue.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-mono text-indigo-600 mr-2">{c.child_line_code}</span> {c.description.substring(0, 60)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Actual Quantity *</label>
                <Input type="number" min="0" step="0.01" value={newContractual.actual_quantity}
                  onChange={e => setNewContractual(p => ({ ...p, actual_quantity: e.target.value }))}
                  className="h-8 text-xs" />
              </div>
            </div>
            {newContractual.catalogue_id && (() => {
              const cat = catalogue.find(c => c.id === newContractual.catalogue_id);
              if (!cat) return null;
              return (
                <div className="flex gap-4 text-xs text-slate-600 bg-white rounded p-2 border border-indigo-100">
                  <span>Code: <strong className="text-indigo-700">{cat.child_line_code}</strong></span>
                  <span>Rate: <strong>€{cat.contract_unit_price}</strong></span>
                  <span>UoM: <strong>{cat.unit_of_measure}</strong></span>
                  <span>Est. Total: <strong>€{(Number(newContractual.actual_quantity) * cat.contract_unit_price).toFixed(2)}</strong></span>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addContractualMutation.mutate()} disabled={addContractualMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-1 h-7 text-xs">
                {addContractualMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddContractual(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-20">Parent</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-20">Code</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Description</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-16">Unit</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-24">Def. Qty</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-24">Act. Qty</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Unit Rate €</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Total €</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-24">Version</th>
                {canEdit && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractualItems.length === 0 && (
                <tr><td colSpan={10} className="text-center py-6 text-slate-400 text-xs">No contractual items added yet. Click "Add Item" to select from the FMPI catalogue.</td></tr>
              )}
              {contractualItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-1.5 py-0.5">{item.parent_fmpi_code}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-slate-700">{item.child_line_code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-700 max-w-xs">{item.description}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{item.unit_of_measure}</td>
                  <td className="px-3 py-2.5 text-xs text-right text-slate-500">{item.default_quantity ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-medium text-slate-800">{item.actual_quantity}</td>
                  <td className="px-3 py-2.5 text-xs text-right text-slate-700">€{item.contract_unit_rate?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-bold text-slate-900">€{item.total_amount?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{item.contract_version}</td>
                  {canEdit && (
                    <td className="px-2 py-2.5">
                      <button onClick={() => deleteItemMutation.mutate(item.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {contractualItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                  <td colSpan={canEdit ? 8 : 7} className="px-3 py-2.5 text-right text-xs font-bold text-indigo-800">Contractual Sub-total</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-indigo-900">€{contractualTotal.toFixed(2)}</td>
                  {canEdit && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ─── SECTION B: Extra Charges ─── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">B</span>
            <h4 className="text-sm font-bold text-orange-900">Extra Charges</h4>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setShowAddExtra(true)} className="bg-orange-500 hover:bg-orange-600 gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Add Extra Charge
            </Button>
          )}
        </div>

        {showAddExtra && (
          <div className="px-4 py-3 bg-orange-50/50 border-b border-orange-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Extra Charge Type *</label>
                <Select value={newExtra.extra_charge_type_id} onValueChange={v => setNewExtra(p => ({ ...p, extra_charge_type_id: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {extraChargeTypes.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="font-mono text-orange-600 mr-2">{e.extra_charge_code}</span> {e.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Quantity *</label>
                <Input type="number" min="0" step="0.01" value={newExtra.actual_quantity}
                  onChange={e => setNewExtra(p => ({ ...p, actual_quantity: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Unit Rate € *</label>
                <Input type="number" min="0" step="0.01" value={newExtra.manual_unit_rate}
                  onChange={e => setNewExtra(p => ({ ...p, manual_unit_rate: e.target.value }))} className="h-8 text-xs" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Justification * (mandatory)
              </label>
              <Input value={newExtra.justification} onChange={e => setNewExtra(p => ({ ...p, justification: e.target.value }))}
                placeholder="Explain why this extra charge is required..." className="h-8 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addExtraMutation.mutate()} disabled={addExtraMutation.isPending} className="bg-orange-500 hover:bg-orange-600 gap-1 h-7 text-xs">
                {addExtraMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddExtra(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-24">EC Code</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Description</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-16">Unit</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Unit Rate €</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Total €</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Justification</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-32">Approval</th>
                {canEdit && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {extraItems.length === 0 && (
                <tr><td colSpan={9} className="text-center py-6 text-slate-400 text-xs">No extra charges added. All extra charges require justification and approval.</td></tr>
              )}
              {extraItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5">{item.extra_charge_code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-700">{item.description}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{item.unit_of_measure}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-medium text-slate-800">{item.actual_quantity}</td>
                  <td className="px-3 py-2.5 text-xs text-right text-slate-700">€{item.final_unit_rate?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-bold text-slate-900">€{item.total_amount?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 max-w-xs">{item.justification}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <Badge className={`text-xs ${APPROVAL_COLORS[item.approval_status] || ''}`}>{item.approval_status}</Badge>
                      {item.approval_status === 'Pending' && (
                        <button onClick={() => approveItemMutation.mutate({ itemId: item.id, status: 'Approved' })} className="text-emerald-500 hover:text-emerald-700" title="Approve">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2.5">
                      <button onClick={() => deleteItemMutation.mutate(item.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {extraItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-orange-200 bg-orange-50">
                  <td colSpan={canEdit ? 5 : 4} className="px-3 py-2.5 text-right text-xs font-bold text-orange-800">Extra Charges Sub-total</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-orange-900">€{extraTotal.toFixed(2)}</td>
                  <td colSpan={canEdit ? 3 : 2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ─── Grand Total ─── */}
      <div className="bg-slate-900 rounded-xl p-5 flex items-center justify-end gap-8 flex-wrap">
        <div className="text-right">
          <p className="text-xs text-slate-400">Contractual Total</p>
          <p className="text-lg font-bold text-white">€{contractualTotal.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Extra Charges Total</p>
          <p className="text-lg font-bold text-orange-400">€{extraTotal.toFixed(2)}</p>
        </div>
        <div className="text-right border-l border-slate-700 pl-8">
          <p className="text-xs text-slate-400">Grand Total (excl. VAT)</p>
          <p className="text-2xl font-bold text-emerald-400">€{grandTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Audit Footer */}
      {order && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-500">
          <div><span className="font-semibold text-slate-700 block">Contract Version</span>{order.contract_version || '—'}</div>
          <div><span className="font-semibold text-slate-700 block">Submitted By</span>{order.submitted_by || '—'}</div>
          <div><span className="font-semibold text-slate-700 block">Submitted At</span>{order.submitted_at ? new Date(order.submitted_at).toLocaleString() : '—'}</div>
          <div><span className="font-semibold text-slate-700 block">Approved By</span>{order.approved_by || '—'}</div>
        </div>
      )}
    </div>
  );
}