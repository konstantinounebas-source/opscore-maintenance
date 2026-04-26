import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Loader2 } from "lucide-react";
import PlanningRuleCard from "./planningrules/PlanningRuleCard";
import PlanningRuleCategoryForm from "./planningrules/PlanningRuleCategoryForm";
import {
  SEED_PLANNING_RULE_CATEGORIES,
  SEED_PLANNING_RULES,
} from "./planningrules/planningRulesUtils";

export default function Stage3PlanningRulesTab() {
  const queryClient = useQueryClient();
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Load categories
  const { data: allCategories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["stage3_planning_cats"],
    queryFn: () => base44.entities.StationLogPlanningRuleCategories.list(),
  });

  // Load rules
  const { data: allRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["stage3_planning_rules"],
    queryFn: () => base44.entities.StationLogPlanningRules.list(),
  });

  // Seed data if empty
  useEffect(() => {
    const seed = async () => {
      if (allCategories.length === 0 && !catsLoading) {
        const created = await base44.entities.StationLogPlanningRuleCategories.bulkCreate(SEED_PLANNING_RULE_CATEGORIES);
        // Map new IDs to rules
        const categoryMap = {};
        for (let i = 0; i < created.length; i++) {
          const seedCat = SEED_PLANNING_RULE_CATEGORIES[i];
          categoryMap[seedCat.category_name] = created[i].id;
        }
        // Create rules with correct category IDs
        const rulesToCreate = SEED_PLANNING_RULES.map(r => ({
          ...r,
          category_id: categoryMap[r.category_name],
          category_name: undefined, // Remove the helper field
        })).filter(r => r.category_id);
        if (rulesToCreate.length > 0) {
          await base44.entities.StationLogPlanningRules.bulkCreate(rulesToCreate);
        }
        queryClient.invalidateQueries({ queryKey: ["stage3_planning_cats"] });
        queryClient.invalidateQueries({ queryKey: ["stage3_planning_rules"] });
      }
    };
    seed();
  }, [allCategories.length, catsLoading, queryClient]);

  const categories = showInactive
    ? allCategories
    : allCategories.filter(c => c.is_active !== false);

  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stage3_planning_cats"] });
    queryClient.invalidateQueries({ queryKey: ["stage3_planning_rules"] });
  };

  if (catsLoading || rulesLoading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading planning rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-800">Planning Rules</h2>
        <p className="text-sm text-slate-600">
          Rules define which Stage 3 deadlines, planned dates, milestones, or tasks are suggested for a station log based on Stage 1 dates, Stage 2 output, and station data.
        </p>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <span className="font-bold">ℹ️ Note:</span> Stage 3 rules do not schedule work directly. They generate planning suggestions and deadlines. The user will later review and save them in Stage 3 Planning Workspace.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-8 text-xs"
            onClick={refresh}
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1 h-8 text-xs"
            onClick={() => setShowNewCategoryForm(true)}
          >
            <Plus className="h-3 w-3" /> Add Category
          </Button>
        </div>
      </div>

      {/* New Category Form */}
      {showNewCategoryForm && (
        <PlanningRuleCategoryForm
          onSaved={() => {
            setShowNewCategoryForm(false);
            refresh();
          }}
          onCancel={() => setShowNewCategoryForm(false)}
        />
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {sortedCategories.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
            <p className="text-sm text-slate-600">No planning rule categories yet.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1"
              onClick={() => setShowNewCategoryForm(true)}
            >
              <Plus className="h-3 w-3" /> Create First Category
            </Button>
          </div>
        ) : (
          sortedCategories.map(cat => (
            <PlanningRuleCard
              key={cat.id}
              category={cat}
              rules={allRules}
              allRules={allRules}
              onRefresh={refresh}
            />
          ))
        )}
      </div>
    </div>
  );
}