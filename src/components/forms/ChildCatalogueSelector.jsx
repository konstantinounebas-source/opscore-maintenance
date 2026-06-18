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
  Package
} from "lucide-react";

export default function ChildCatalogueSelector({ catalogue = [], onAddChild }) {
  // First category expanded by default
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auto-expand first category on load
  React.useEffect(() => {
    const filtered = catalogue.filter(item => item.active !== false);
    if (filtered.length > 0 && Object.keys(expandedCategories).length === 0) {
      const firstCat = filtered[0].child_category || 'Other';
      setExpandedCategories({ [firstCat]: true });
    }
  }, [catalogue]);

  const groupedByCategory = useMemo(() => {
    const filtered = catalogue.filter(item => item.active !== false);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return {
        search: {
          name: `Search: "${searchQuery}"`,
          items: filtered.filter(item => 
            item.child_name?.toLowerCase().includes(query) ||
            item.child_code?.toLowerCase().includes(query) ||
            item.child_category?.toLowerCase().includes(query) ||
            item.child_type?.toLowerCase().includes(query)
          )
        }
      };
    }

    return filtered.reduce((acc, item) => {
      const cat = item.child_category || 'Other';
      if (!acc[cat]) acc[cat] = { name: cat, items: [] };
      acc[cat].items.push(item);
      return acc;
    }, {});
  }, [catalogue, searchQuery]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-700">Add Child Components</h3>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(groupedByCategory).map(([catKey, category]) => (
            <div key={catKey} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full px-3 py-2 bg-slate-50 border-b flex items-center justify-between hover:bg-slate-100"
              >
                <div className="flex items-center gap-2">
                  {expandedCategories[catKey] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">{category.name}</span>
                  <Badge variant="outline" className="h-5 text-xs">{category.items.length}</Badge>
                </div>
              </button>

              {expandedCategories[catKey] && (
                <div className="divide-y">
                  {category.items.map(child => {
                    const price = child.pricing_type === "Bundle" ? child.bundle_price : child.unit_price;
                    return (
                      <div key={child.id} className="px-3 py-2 flex items-center justify-between hover:bg-emerald-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-bold text-emerald-600">{child.child_code}</span>
                            {child.pricing_type === "Bundle" && (
                              <Badge variant="outline" className="h-5 text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Bundle
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 truncate">{child.display_name || child.child_name}</p>
                          {child.child_type && <p className="text-xs text-slate-500">{child.child_type}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-700">€{price}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddChild(child)}
                            className="h-7 text-xs gap-1 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}