import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Trash2, 
  Search,
  Package,
  Wrench,
  Euro,
  ChevronRight,
  ChevronDown
} from "lucide-react";

export default function FMPICalculator({ rows = [], onRowsChange, catalogue = [], childCatalog = [], typeTemplates = [], asset = null }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('contractual'); // 'contractual' or 'extra'

  // Filter child catalog to only items matching the asset's shelter type
  const filteredChildCatalog = useMemo(() => {
    const shelterType = asset?.shelter_type || asset?.installed_shelter_type || asset?.ordered_shelter_type;
    if (!shelterType || !typeTemplates.length) return childCatalog.filter(c => c.active !== false);
    
    const normalizeType = (s) => s?.trim().replace(/^type\s+/i, "").toUpperCase();
    const normalized = normalizeType(shelterType);
    const templateIds = new Set(
      typeTemplates
        .filter(t => normalizeType(t.shelter_type_code) === normalized && t.active !== false)
        .map(t => t.child_catalog_id)
    );
    if (!templateIds.size) return childCatalog.filter(c => c.active !== false);
    return childCatalog.filter(c => templateIds.has(c.id));
  }, [childCatalog, typeTemplates, asset]);

  // Group child catalog by category
  const groupedChildCatalog = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return {
        search: {
          name: `Search: "${searchQuery}"`,
          items: filteredChildCatalog.filter(item => 
            item.child_name?.toLowerCase().includes(query) ||
            item.display_name?.toLowerCase().includes(query) ||
            item.child_code?.toLowerCase().includes(query) ||
            item.child_category?.toLowerCase().includes(query)
          )
        }
      };
    }

    return filteredChildCatalog.reduce((acc, item) => {
      const cat = item.child_category || 'Other';
      if (!acc[cat]) acc[cat] = { name: cat, items: [] };
      acc[cat].items.push(item);
      return acc;
    }, {});
  }, [filteredChildCatalog, searchQuery]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const addChildToRows = (child) => {
    const newRow = {
      _id: Date.now().toString(),
      item_type: 'Child Component',
      child_catalog_id: child.id,
      catalog_id: child.id,
      catalog_code: child.child_code,
      description: child.display_name || child.child_name,
      qty: 1,
      unit_price: child.pricing_type === "Bundle" ? child.bundle_price : child.unit_price,
      confirmed: false,
      comments: '',
      excel_contract_number: child.excel_contract_number || '',
      contract_type: child.contract_type || '',
    };
    onRowsChange([...rows, newRow]);
  };

  const removeRow = (index) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index, updates) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    onRowsChange(newRows);
  };

  const totalCost = useMemo(() => {
    return rows.reduce((sum, row) => {
      const qty = parseFloat(row.qty) || 0;
      const price = parseFloat(row.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
  }, [rows]);

  const fmtNum = (n) => {
    if (n == null || n === "" || isNaN(n)) return "—";
    return Number(n).toFixed(2);
  };

  const getItemTypeBadge = (row) => {
    if (row.item_type === 'Child Component') {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Child</Badge>;
    }
    if (row.item_type === 'Extra Charge') {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Extra</Badge>;
    }
    return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">Contract</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Selected Items Summary */}
      {rows.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">{rows.length} item{rows.length !== 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-indigo-600">Child components + Extra charges</p>
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
      {rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-3 bg-slate-50 border-b">
            <h3 className="text-sm font-semibold text-slate-700">Selected Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ width: 80 }}>Type</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ width: 80 }}>Code</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Description</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ width: 100 }}>Contract No.</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ width: 80 }}>Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ width: 100 }}>Unit Price</th>
                  <th className="px-3 py-2.5 text-right font-semibold" style={{ width: 100 }}>Total</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Comments</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ width: 50 }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => {
                  const amount = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
                  return (
                    <tr key={row._id} className={`hover:bg-slate-50 ${row.confirmed ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-3 py-2.5">{getItemTypeBadge(row)}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs font-bold text-slate-600">{row.catalog_code || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs text-slate-700">{row.description || 'No description'}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="space-y-1">
                          <p className="text-xs font-mono font-semibold text-indigo-700">{row.excel_contract_number || '—'}</p>
                          {row.contract_type && (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] px-1 py-0">
                              {row.contract_type}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          value={row.qty}
                          onChange={(e) => updateRow(idx, { qty: e.target.value })}
                          className="h-7 text-xs text-center w-16 mx-auto"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-semibold text-slate-700">€{fmtNum(row.unit_price)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge className="bg-indigo-100 text-indigo-800 text-xs font-bold">
                          €{fmtNum(amount)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          value={row.comments || ''}
                          onChange={(e) => updateRow(idx, { comments: e.target.value })}
                          placeholder="Optional..."
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => removeRow(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
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
          
          {/* Grand Total */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Euro className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-indigo-100 font-medium uppercase">Total Contract Value</p>
                <p className="text-2xl font-bold">€{totalCost.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-indigo-100">
              {rows.filter(r => r.confirmed).length} of {rows.length} item{rows.length !== 1 ? 's' : ''} confirmed
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No items selected yet</p>
          <p className="text-xs mt-1">Add child components or extra charges using the sections above</p>
        </div>
      )}
    </div>
  );
}