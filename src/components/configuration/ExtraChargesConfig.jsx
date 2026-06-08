import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Check, X, Upload } from "lucide-react";

export default function ExtraChargesConfig() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const { data: charges = [] } = useQuery({
    queryKey: ["extraCharges"],
    queryFn: () => base44.entities.FMPIContractCatalogue.filter({ item_category: "Extra Charge" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FMPIContractCatalogue.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extraCharges"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FMPIContractCatalogue.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["extraCharges"] }),
  });

  const startEdit = (charge) => {
    setEditingId(charge.id);
    setEditData({
      child_line_code: charge.child_line_code,
      description: charge.description,
      contract_unit_price: charge.contract_unit_price,
      unit_of_measure: charge.unit_of_measure,
    });
  };

  const saveEdit = (charge) => {
    updateMutation.mutate({
      id: charge.id,
      data: editData,
    });
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-semibold text-slate-600">
          Configure extra charges in the main FMPI Contract Catalogue with item_category = "Extra Charge"
        </Label>
        <Badge variant="outline" className="text-xs">
          {charges.length} Extra Charges
        </Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Code</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Description</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Unit Price</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Unit</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {charges.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 px-3 text-center text-slate-400">
                  No extra charges configured. Use the FMPI Contract Catalogue import to add items with item_category = "Extra Charge".
                </td>
              </tr>
            )}
            {charges.map((charge) => (
              <tr key={charge.id} className="hover:bg-slate-50">
                <td className="py-2 px-3">
                  {editingId === charge.id ? (
                    <Input
                      value={editData.child_line_code}
                      onChange={(e) => setEditData({ ...editData, child_line_code: e.target.value })}
                      className="h-7 text-xs"
                    />
                  ) : (
                    <span className="font-mono text-xs font-bold text-amber-600">{charge.child_line_code}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editingId === charge.id ? (
                    <Input
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="h-7 text-xs"
                    />
                  ) : (
                    <span className="text-slate-700">{charge.description}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editingId === charge.id ? (
                    <Input
                      type="number"
                      value={editData.contract_unit_price}
                      onChange={(e) => setEditData({ ...editData, contract_unit_price: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs w-24"
                    />
                  ) : (
                    <span className="text-slate-700">€{charge.contract_unit_price?.toFixed(2)}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editingId === charge.id ? (
                    <Input
                      value={editData.unit_of_measure}
                      onChange={(e) => setEditData({ ...editData, unit_of_measure: e.target.value })}
                      className="h-7 text-xs"
                    />
                  ) : (
                    <span className="text-slate-500">{charge.unit_of_measure}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {editingId === charge.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => saveEdit(charge)}
                        className="h-7 w-7 p-0 text-green-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        className="h-7 w-7 p-0 text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(charge)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(charge.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}