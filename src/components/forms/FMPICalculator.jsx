import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  Euro, 
  ChevronRight, 
  ChevronDown, 
  Search,
  Package
} from "lucide-react";

export default function FMPICalculator({ rows = [], onRowsChange, catalogue = [], childCatalog = [], typeTemplates = [], asset = null }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Group catalogue by parent category (only active items)
  const groupedByCategory = useMemo(() => {
    const filtered = catalogue.filter(item => item.is_active !== false);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return {
        search: {
          name: `Search Results: "${searchQuery}"`,
          items: filtered.filter(item => 
            item.description?.toLowerCase().includes(query) ||
            item.child_line_code?.toLowerCase().includes(query) ||
            item.parent_description?.toLowerCase().includes(query)
          )
        }
      };
    }

    return filtered.reduce((acc, item) => {
      const cat = item.parent_fmpi_code || 'Other';
      const catName = `${cat} - ${item.parent_description || 'Other Services'}`;
      if (!acc[cat]) acc[cat] = { name: catName, items: [] };
      acc[cat].items.push(item);
      return acc;
    }, {});
  }, [catalogue, searchQuery]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: prev[cat] === undefined ? true : !prev[cat] }));
  };

  const isExpanded = (cat) => expandedCategories[cat] !== false;

  const addRow = (catalogueItem) => {
    const newRow = {
      _id: Date.now().toString(),
      catalog_id: catalogueItem.id,
      catalog_code: catalogueItem.child_line_code,
      description: catalogueItem.description,
      qty: catalogueItem.default_quantity || 1,
      unit_price: catalogueItem.contract_unit_price || 0,
      confirmed: false,
      comments: '',
    };
    onRowsChange([...rows, newRow]);
  };

  const removeRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index);
    onRowsChange(newRows);
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

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services by code, description..."
          className="pl-9 h-10 text-sm"
        />
      </div>

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
                  <p className="text-sm font-semibold text-indigo-900">{rows.length} work item{rows.length !== 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-indigo-600">Based on FMPI Contract Catalogue</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-600 font-medium">Total Contract Value</p>
                <p className="text-2xl font-bold text-indigo-900">€{totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Groups */}
      <div className="space-y-3">
        {Object.entries(groupedByCategory).map(([catKey, category]) => (
          <div key={catKey} className="border rounded-lg overflow-hidden bg-white">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(catKey)}
              className="w-full px-4 py-3 bg-slate-50 border-b flex items-center justify-between hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded(catKey) ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-sm font-semibold text-slate-700">{category.name}</span>
                <Badge variant="outline" className="text-xs">{category.items.length} items</Badge>
              </div>
              <span className="text-xs text-slate-500">Click to {isExpanded(catKey) ? 'collapse' : 'expand'}</span>
            </button>

            {/* Category Items */}
            {isExpanded(catKey) && (
              <div className="divide-y divide-slate-100">
                {category.items.map(item => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-600">{item.child_line_code}</span>
                        <Badge variant="outline" className="text-xs h-5">{item.unit_of_measure || 'unit'}</Badge>
                      </div>
                      <p className="text-sm text-slate-800 truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Contract unit price</p>
                        <p className="text-sm font-bold text-slate-700">€{(item.contract_unit_price ?? 0).toFixed(2)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addRow(item)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Rows Table */}
      {rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden bg-white mt-6">
          <div className="px-4 py-3 bg-slate-50 border-b">
            <h3 className="text-sm font-semibold text-slate-700">Selected Work Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
              <tr>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ minWidth: 200 }}>Child / Layout</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ minWidth: 250 }}>Service Description</th>
              <th className="px-3 py-2.5 text-center font-semibold" style={{ minWidth: 100 }}>Quantity</th>
              <th className="px-3 py-2.5 text-center font-semibold" style={{ minWidth: 120 }}>Unit Price (€)</th>
              <th className="px-3 py-2.5 text-center font-semibold" style={{ minWidth: 120 }}>Total (€)</th>
              <th className="px-3 py-2.5 text-center font-semibold" style={{ minWidth: 80 }}>Confirm</th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ minWidth: 150 }}>Comments</th>
              <th className="px-2 py-2.5" style={{ width: 40 }}></th>
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
              const amount = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
              // Filter child catalog to only items matching the asset's shelter type
              const shelterType = asset?.shelter_type || asset?.installed_shelter_type || asset?.ordered_shelter_type;
              const filteredChildCatalog = (() => {
                if (!shelterType || !typeTemplates.length) return childCatalog;
                const normalizeType = (s) => s?.trim().replace(/^type\s+/i, "").toUpperCase();
                const normalized = normalizeType(shelterType);
                const templateIds = new Set(
                  typeTemplates
                    .filter(t => normalizeType(t.shelter_type_code) === normalized && t.active !== false)
                    .map(t => t.child_catalog_id)
                );
                if (!templateIds.size) return childCatalog;
                return childCatalog.filter(c => templateIds.has(c.id));
              })();

              return (
                <tr key={row._id} className={`transition-colors ${row.confirmed ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50"}`}>
                  <td className="px-3 py-2.5">
                    <select
                      value={row.child_catalog_id || ''}
                      onChange={(e) => {
                        const selectedChild = filteredChildCatalog.find(c => c.id === e.target.value);
                        if (selectedChild) {
                          onRowsChange(rows.map((r, i) => {
                            if (i === idx) {
                              return {
                                ...r,
                                child_catalog_id: selectedChild.id,
                                catalog_id: selectedChild.id,
                                description: selectedChild.display_name || selectedChild.child_name,
                                catalog_code: selectedChild.child_code,
                                unit_price: selectedChild.pricing_type === "Bundle" ? selectedChild.bundle_price : selectedChild.unit_price,
                              };
                            }
                            return r;
                          }));
                        }
                      }}
                      className="text-xs h-8 w-full border border-slate-300 rounded-md px-2 py-1 bg-white"
                    >
                      <option value="">— Select Child —</option>
                      {filteredChildCatalog.map(child => (
                        <option key={child.id} value={child.id}>
                          {child.display_name || child.child_name} ({child.child_code})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-indigo-600">{row.catalog_code || '—'}</span>
                      <span className="text-xs text-slate-600 mt-0.5">{row.description || 'Select item...'}</span>
                    </div>
                  </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.qty}
                          onChange={(e) => updateRow(idx, { qty: e.target.value })}
                          className="text-xs h-8 text-center w-20 mx-auto"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-medium text-slate-700">€{fmtNum(row.unit_price)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className="bg-blue-100 text-blue-800 text-xs font-bold">
                          €{fmtNum(amount)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Checkbox
                          checked={!!row.confirmed}
                          onCheckedChange={(v) => updateRow(idx, { confirmed: !!v })}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          value={row.comments}
                          onChange={(e) => updateRow(idx, { comments: e.target.value })}
                          placeholder="Optional..."
                          className="text-xs h-8"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={rows.length === 1}
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
          <p className="text-sm">No work items selected yet</p>
          <p className="text-xs mt-1">Click "Add" on services from the catalogue above to build your pricing order</p>
        </div>
      )}
    </div>
  );
}