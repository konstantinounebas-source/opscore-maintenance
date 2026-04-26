import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SEED_CATEGORIES } from "./workrules/workRulesUtils";
import CategoryForm from "./workrules/CategoryForm";
import CategoryCard from "./workrules/CategoryCard";

export default function Stage2WorkRulesTab() {
  const queryClient = useQueryClient();
  const [addingCategory, setAddingCategory] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["stationLogWorkRuleCategories"],
    queryFn: () => base44.entities.StationLogWorkRuleCategories.list(),
  });

  const { data: triggerValues = [] } = useQuery({
    queryKey: ["stationLogWorkRuleTriggerValues"],
    queryFn: () => base44.entities.StationLogWorkRuleTriggerValues.list(),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["stationLogWorkRules"],
    queryFn: () => base44.entities.StationLogWorkRules.list(),
  });

  const { data: workItems = [] } = useQuery({
    queryKey: ["stationLogWorkItems"],
    queryFn: () => base44.entities.StationLogWorkItems.list(),
    select: d => d.filter(i => i.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["stationLogResourceTypes"],
    queryFn: () => base44.entities.StationLogResourceTypes.list(),
    select: d => d.filter(r => r.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  });

  const { data: dropdownOptions = [] } = useQuery({
    queryKey: ["stationLogDropdownOptions"],
    queryFn: () => base44.entities.StationLogDropdownOptions.list(),
  });

  // Seed initial categories only if empty
  useEffect(() => {
    if (catsLoading || categories.length > 0) return;
    const seed = async () => {
      await base44.entities.StationLogWorkRuleCategories.bulkCreate(
        SEED_CATEGORIES.map(c => ({ ...c, is_active: true }))
      );
      queryClient.invalidateQueries({ queryKey: ["stationLogWorkRuleCategories"] });
    };
    seed();
  }, [catsLoading, categories.length]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stationLogWorkRuleCategories"] });
    queryClient.invalidateQueries({ queryKey: ["stationLogWorkRuleTriggerValues"] });
    queryClient.invalidateQueries({ queryKey: ["stationLogWorkRules"] });
    setAddingCategory(false);
  };

  const displayedCategories = categories
    .filter(c => showInactive || c.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Work Rules</h3>
          <p className="text-xs text-slate-500">
            Categories link Stage 1 fields to work items. Each trigger value generates specific work rules in Stage 2.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <Button size="sm" className="gap-1 h-8" onClick={() => setAddingCategory(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <strong>How it works:</strong> Each Category links to a Stage 1 field (e.g. <code>shelter_type</code>). 
        Add Trigger Values (e.g. "TYPE C3") under each category, then add Work Rules under each trigger value. 
        Stage 2 will automatically match station data and propose work items.
      </div>

      {/* New Category Form */}
      {addingCategory && (
        <CategoryForm
          opt={null}
          existingCategories={categories}
          onSave={refresh}
          onCancel={() => setAddingCategory(false)}
        />
      )}

      {/* Category List */}
      {catsLoading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
      ) : displayedCategories.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
          No categories yet. Click "Add Category" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {displayedCategories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              triggerValues={triggerValues}
              allCategories={categories}
              rules={rules}
              workItems={workItems}
              resources={resources}
              dropdownOptions={dropdownOptions}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}