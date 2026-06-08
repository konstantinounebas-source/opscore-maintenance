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
    activeCharges: charges.filter(c => c.is_active !== false).length,
    first5Sample: charges.slice(0, 5).map(c => ({
      code: c.child_line_code,
      description: c.description?.substring(0, 50),
      price: c.contract_unit_price,
      category: c.item_category,
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

    // Group by parent_fmpi_code (58, 59, 60, 61, 62)
    const grouped = filtered.reduce((acc, item) => {
      const cat = item.parent_fmpi_code || 'Other';
      const catName = item.parent_description || `FMPI ${cat}`;
      if (!acc[cat]) acc[cat] = { name: catName, items: [] };
      acc[cat].items.push(item);
      return acc;
    }, {});
    
    return grouped;
  }, [charges, searchQuery]);

  // Initialize all categories as expanded based on charges
  const [expanded, setExpanded] = useState(() => {
    if (charges.length === 0) return {};
    const initialExpanded = {};
    charges.forEach(item => {
      const cat = item.parent_fmpi_code || 'Other';
      initialExpanded[cat] = true;
    });
    return initialExpanded;
  });

  // Keep categories expanded when new charges are added
  useEffect(() => {
    if (charges.length > 0) {
      setExpanded(prev => {
        const updated = { ...prev };
        charges.forEach(item => {
          const cat = item.parent_fmpi_code || 'Other';
          if (!updated[cat]) updated[cat] = true;
        });
        return updated;
      });
    }
  }, [charges]);

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
              <div>Active records (is_active !== false): <span className="font-mono font-bold">{debugInfo.activeCharges}</span></div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">First 5 matching records:</div>
              <div className="space-y-1">
                {debugInfo.first5Sample.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-600">
                    <span className="font-mono text-xs font-bold text-indigo-600">{item.code}</span>
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="font-semibold text-slate-700">€{item.price}</span>
                    <span className="text-xs text-slate-500">{item.category}</span>
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
                  {category.items.map(charge => (
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
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}