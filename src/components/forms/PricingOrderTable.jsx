import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trash2, 
  Euro, 
  Package,
  Wrench,
  AlertTriangle
} from "lucide-react";

export default function PricingOrderTable({ rows = [], onRowsChange }) {
  const updateRow = (index, updates) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    onRowsChange(newRows);
  };

  const removeRow = (index) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const totalCost = useMemo(() => {
    return rows.reduce((sum, row) => sum + ((parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0)), 0);
  }, [rows]);

  const fmtNum = (n) => {
    if (n == null || n === "" || isNaN(n)) return "—";
    return Number(n).toFixed(2);
  };

  const getItemTypeBadge = (row) => {
    if (row.item_source === "extra_charge") {
      return (
        <Badge className="h-5 text-xs bg-amber-100 text-amber-700 border-amber-200">
          <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Extra Charge
        </Badge>
      );
    }
    if (row.item_source === "child_component") {
      return (
        <Badge className="h-5 text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
          <Wrench className="w-2.5 h-2.5 mr-1" /> Child Component
        </Badge>
      );
    }
    return (
      <Badge className="h-5 text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
        <Package className="w-2.5 h-2.5 mr-1" /> FMPI Contract
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {rows.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">{rows.length} item{rows.length !== 1 ? 's' : ''} in pricing order</p>
                  <p className="text-xs text-indigo-600">Contractual + Extra Charges</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-600 font-medium">Total Value</p>
                <p className="text-2xl font-bold text-indigo-900">€{totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600">Code</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600" style={{ minWidth: 200 }}>Description</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600" style={{ width: 100 }}>Qty</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600" style={{ width: 100 }}>Unit Price</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600" style={{ width: 100 }}>Total</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600">Comments</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600" style={{ width: 50 }}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const amount = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
              return (
                <tr key={row._id} className={`hover:bg-slate-50 ${row.confirmed ? "bg-emerald-50/30" : ""}`}>
                  <td className="px-3 py-3">{getItemTypeBadge(row)}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs font-bold text-slate-600">{row.catalog_code || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-slate-700">{row.description || 'No description'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={row.qty}
                      onChange={(e) => updateRow(idx, { qty: e.target.value })}
                      className="h-7 text-xs text-center w-20"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-xs font-semibold text-slate-700">€{fmtNum(row.unit_price)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-xs font-bold text-indigo-700">€{fmtNum(amount)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      value={row.comments || ''}
                      onChange={(e) => updateRow(idx, { comments: e.target.value })}
                      placeholder="Comments..."
                      className="h-7 text-xs w-full"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(idx)}
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {rows.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No items added yet</p>
            <p className="text-xs mt-1">Use the sections above to add child components or extra charges</p>
          </div>
        )}
      </div>
    </div>
  );
}