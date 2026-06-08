import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Search,
  AlertTriangle
} from "lucide-react";

export default function ExtraChargeSelector({ charges = [], onAddCharge }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // Debug info
  const debugInfo = {
    totalLoaded: charges.length,
    extraCharges: charges.filter(c => c.item_category === 'Extra Charge').length,
    contractualItems: charges.filter(c => c.item_category === 'Contractual').length,
    activeCharges: charges.filter(c => c.is_active !== false).length,
    byCategory: {
      '58': charges.filter(c => c.parent_fmpi_code === '58' && c.is_active !== false).length,
      '59': charges.filter(c => c.parent_fmpi_code === '59' && c.is_active !== false).length,
      '60': charges.filter(c => c.parent_fmpi_code === '60' && c.is_active !== false).length,
      '61': charges.filter(c => c.parent_fmpi_code === '61' && c.is_active !== false).length,
      '62': charges.filter(c => c.parent_fmpi_code === '62' && c.is_active !== false).length,
    },
    first5Sample: charges.slice(0, 5).map(c => ({
      code: c.child_line_code,
      description: c.description?.substring(0, 50),
      price: c.contract_unit_price,
      category: c.item_category,
      parent: c.parent_fmpi_code,
    })),
  };

  const groupedByCategory = useMemo(() => {
    const filtered = charges.filter(item => item.is_active !== false);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return {
        search: {
          name: `Search: "${searchQuery}"`,
          items: filtered.filter(item => 
            item.description?.toLowerCase().includes(query) ||
            item.child_line_code?.toLowerCase().includes(query) ||
            item.parent_fmpi_code?.toLowerCase().includes(query)
          )
        }
      };
    }

    // Fixed FMPI categories - always show all 5
    const categoryNames = {
      '58': '58 - Civil Works (Footway)',
      '59': '59 - Refurbishment (Factory)',
      '60': '60 - Refurbishment (Site)',
      '61': '61 - Civil Works (Existing)',
      '62': '62 - Decommissioning',
    };

    // Initialize all 5 categories
    const grouped = {};
    Object.keys(categoryNames).forEach(cat => {
      grouped[cat] = { name: categoryNames[cat], items: [] };
    });

    // Group items by parent_fmpi_code
    filtered.forEach(item => {
      const cat = item.parent_fmpi_code;
      if (cat && grouped[cat]) {
        grouped[cat].items.push(item);
      }
    });
    
    return grouped;
  }, [charges, searchQuery]);

  // Initialize all 5 FMPI categories as expanded
  const [expanded, setExpanded] = useState({
    '58': true,
    '59': true,
    '60': true,
    '61': true,
    '62': true,
  });

  const toggleCategory = (cat) => {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-700">Add Extra Charges</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="h-7 text-xs"
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </Button>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search charges..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {showDebug && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
            <div className="font-semibold text-slate-700">Debug Info:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Total FMPIContractCatalogue loaded: <span className="font-mono font-bold">{debugInfo.totalLoaded}</span></div>
              <div>Records with item_category="Extra Charge": <span className="font-mono font-bold">{debugInfo.extraCharges}</span></div>
              <div>Records with item_category="Contractual": <span className="font-mono font-bold">{debugInfo.contractualItems}</span></div>
              <div>Active records (is_active !== false): <span className="font-mono font-bold">{debugInfo.activeCharges}</span></div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">Items per FMPI category:</div>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(debugInfo.byCategory).map(([cat, count]) => (
                  <div key={cat} className="bg-white border border-slate-200 rounded px-2 py-1 text-center">
                    <div className="font-mono font-bold text-indigo-600">{cat}</div>
                    <div className="text-slate-700 font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">First 5 matching records:</div>
              <div className="space-y-1">
                {debugInfo.first5Sample.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-600">
                    <span className="font-mono text-xs font-bold text-indigo-600">{item.code}</span>
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="font-semibold text-slate-700">€{item.price}</span>
                    <span className="text-xs text-slate-500">Cat: {item.category} | FMPI: {item.parent}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(groupedByCategory).map(([catKey, category]) => (
            <div key={catKey} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full px-3 py-2 bg-slate-50 border-b flex items-center justify-between hover:bg-slate-100"
              >
                <div className="flex items-center gap-2">
                  {expanded[catKey] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">{category.name}</span>
                  <Badge variant="outline" className="h-5 text-xs">{category.items.length}</Badge>
                </div>
              </button>

              {expanded[catKey] && (
                <div className="divide-y">
                  {category.items.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                      No items in this category
                    </div>
                  ) : (
                    category.items.map(charge => (
                      <div key={charge.id} className="px-3 py-2 flex items-center justify-between hover:bg-amber-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-bold text-amber-600">{charge.child_line_code}</span>
                          </div>
                          <p className="text-xs text-slate-700 truncate">{charge.description}</p>
                          {charge.notes && <p className="text-xs text-slate-500 line-clamp-1">{charge.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-600">€{charge.contract_unit_price}</span>
                          <span className="text-xs text-slate-500">/{charge.unit_of_measure}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddCharge(charge)}
                            className="h-7 text-xs gap-1 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}