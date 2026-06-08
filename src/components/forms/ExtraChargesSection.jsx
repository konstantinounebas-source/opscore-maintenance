import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Euro } from "lucide-react";

export default function ExtraChargesSection({ 
  extraCharges, 
  setExtraCharges, 
  activeExtraChargeTypes,
  totalCost 
}) {
  const emptyExtraCharge = () => ({
    _id: Math.random().toString(36).slice(2),
    extra_charge_type_id: "",
    quantity: 1,
    unit_rate: "",
    justification: "",
  });

  const updateExtraCharge = (idx, patch) => {
    setExtraCharges(prev => prev.map((ec, i) => i === idx ? { ...ec, ...patch } : ec));
  };

  const addExtraCharge = () => setExtraCharges(prev => [...prev, emptyExtraCharge()]);
  const removeExtraCharge = (idx) => setExtraCharges(prev => prev.filter((_, i) => i !== idx));

  const extraChargesTotal = extraCharges.reduce((sum, ec) => {
    const qty = parseFloat(ec.quantity) || 0;
    const rate = parseFloat(ec.unit_rate) || 0;
    return sum + (qty * rate);
  }, 0);

  const grandTotal = totalCost + extraChargesTotal;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-amber-100 text-amber-800 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold rounded-tl-md" style={{ minWidth: 200 }}>Τύπος Επιπλέον Χρέωσης</th>
              <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 100 }}>Ποσότητα</th>
              <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 150 }}>Τιμή Μονάδας (€)</th>
              <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 120 }}>Σύνολο (€)</th>
              <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 200 }}>Αιτιολόγηση *</th>
              <th className="px-2 py-2 rounded-tr-md" style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {extraCharges.map((ec, idx) => {
              const ecType = activeExtraChargeTypes.find(t => t.id === ec.extra_charge_type_id);
              const amount = (parseFloat(ec.quantity) || 0) * (parseFloat(ec.unit_rate) || 0);
              return (
                <tr
                  key={ec._id}
                  className="text-sm transition-colors bg-white hover:bg-amber-50/30"
                >
                  <td className="px-2 py-1.5">
                    <Select value={ec.extra_charge_type_id || "_none"} onValueChange={v => updateExtraCharge(idx, { extra_charge_type_id: v === "_none" ? "" : v })}>
                      <SelectTrigger className={`text-xs h-8 ${!ec.extra_charge_type_id ? "border-amber-300" : ""}`}>
                        <SelectValue placeholder="Επιλογή..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Επιλογή —</SelectItem>
                        {activeExtraChargeTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="font-mono text-xs mr-1">{t.extra_charge_code}</span>
                            {t.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ecType?.description && (
                      <p className="text-xs text-slate-400 mt-0.5 pl-1 truncate">{ecType.description}</p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ec.quantity}
                      onChange={e => updateExtraCharge(idx, { quantity: e.target.value })}
                      className="text-xs h-8 text-center"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ec.unit_rate}
                      onChange={e => updateExtraCharge(idx, { unit_rate: e.target.value })}
                      className="text-xs h-8 text-center"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1 h-8 px-2 rounded-md bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                      <span>{amount.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <Textarea
                      value={ec.justification}
                      onChange={e => updateExtraCharge(idx, { justification: e.target.value })}
                      placeholder="Απαιτείται αιτιολόγηση..."
                      className="text-xs h-8 min-h-[32px]"
                      rows={1}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeExtraCharge(idx)}
                      disabled={extraCharges.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={addExtraCharge} className="gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" /> Προσθήκη Επιπλέον Χρέωσης
        </Button>
      </div>

      {/* Extra Charges Total */}
      {extraCharges.length > 0 && extraChargesTotal > 0 && (
        <div className="flex justify-end pt-2 border-t border-amber-200 mt-2">
          <div className="bg-amber-600 text-white rounded-xl px-6 py-3 flex items-center gap-3 shadow-sm">
            <Euro className="w-5 h-5 text-amber-200" />
            <div>
              <p className="text-xs text-amber-200 font-medium uppercase tracking-wide">ΣΥΝΟΛΟ ΕΠΙΠΛΕΟΝ ΧΡΕΩΣΕΩΝ €</p>
              <p className="text-2xl font-bold tabular-nums">{extraChargesTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grand Total */}
      {(totalCost > 0 || extraChargesTotal > 0) && (
        <div className="flex justify-end pt-3 mt-2">
          <div className="bg-slate-800 text-white rounded-xl px-8 py-4 flex items-center gap-4 shadow-lg">
            <Euro className="w-6 h-6 text-slate-300" />
            <div>
              <p className="text-xs text-slate-300 font-medium uppercase tracking-wide">ΓΕΝΙΚΟ ΣΥΝΟΛΟ €</p>
              <p className="text-3xl font-bold tabular-nums">{grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}