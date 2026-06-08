import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, FileText, Loader2 } from "lucide-react";
import PricingOrderView from "@/components/pricing/PricingOrderView";
import { toast } from "sonner";

const STATUS_COLORS = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-blue-100 text-blue-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function PricingOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ incident_id: '', work_order_id: '', contract_version: 'v1.0-2024', notes: '' });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pricingOrders'],
    queryFn: () => base44.entities.PricingOrders.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newForm.incident_id || !newForm.work_order_id) throw new Error('Incident ID and Work Order ID are required');
      // Generate a ref
      const ref = `PO-${Date.now().toString(36).toUpperCase()}`;
      const order = await base44.entities.PricingOrders.create({
        pricing_order_ref: ref,
        incident_id: newForm.incident_id,
        work_order_id: newForm.work_order_id,
        contract_version: newForm.contract_version,
        notes: newForm.notes,
        status: 'Draft',
        contractual_total: 0,
        extra_charges_total: 0,
        grand_total: 0,
      });
      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['pricingOrders'] });
      setShowCreate(false);
      setSelectedId(order.id);
      setNewForm({ incident_id: '', work_order_id: '', contract_version: 'v1.0-2024', notes: '' });
      toast.success('Pricing Order created');
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || (o.pricing_order_ref || '').toLowerCase().includes(q) || (o.incident_id || '').toLowerCase().includes(q) || (o.work_order_id || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <TopHeader
        title="FMPI Pricing Orders"
        subtitle="Audit-ready pricing orders referencing FMPI contract catalogue (categories 58–62)"
        actions={
          <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" /> New Pricing Order
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference, incident, WO..." className="pl-9 h-9" />
          </div>
          <Badge variant="outline" className="text-xs">{orders.length} orders</Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No pricing orders found.</p>
            <p className="text-xs mt-1">Create one to start building an audit-ready FMPI submission.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Incident ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Work Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Contractual €</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Extras €</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Grand Total €</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Version</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Created</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedId(order.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700 font-semibold">{order.pricing_order_ref || order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{order.incident_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{order.work_order_id}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[order.status] || ''}`}>{order.status}</Badge></td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">€{(order.contractual_total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-orange-700">€{(order.extra_charges_total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">€{(order.grand_total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{order.contract_version || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{order.created_date ? new Date(order.created_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelectedId(order.id); }} className="h-7 text-xs">Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New FMPI Pricing Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Incident ID *</label>
              <Input value={newForm.incident_id} onChange={e => setNewForm(p => ({ ...p, incident_id: e.target.value }))} placeholder="INC-XXXX" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Work Order ID *</label>
              <Input value={newForm.work_order_id} onChange={e => setNewForm(p => ({ ...p, work_order_id: e.target.value }))} placeholder="WO-XXXX" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Contract Version</label>
              <Input value={newForm.contract_version} onChange={e => setNewForm(p => ({ ...p, contract_version: e.target.value }))} placeholder="v1.0-2024" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Notes</label>
              <Input value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." className="h-9" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={open => !open && setSelectedId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> FMPI Pricing Order
            </DialogTitle>
          </DialogHeader>
          {selectedId && (
            <PricingOrderView
              pricingOrderId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}