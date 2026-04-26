import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Edit2, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import PlanningRuleForm from "./PlanningRuleForm";
import {
  formatAppliesToString,
  formatDateOffsetString,
  getLabelForItemType,
} from "./planningRulesUtils";

export default function PlanningRuleCard({ category, rules, allRules, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const categoryRules = rules.filter(r => r.category_id === category.id);
  const sortedRules = [...categoryRules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleToggleActive = async (ruleId, currentActive) => {
    setToggling(ruleId);
    await base44.entities.StationLogPlanningRules.update(ruleId, {
      is_active: !currentActive,
    });
    setToggling(null);
    onRefresh();
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Delete this rule?")) return;
    setDeleting(ruleId);
    await base44.entities.StationLogPlanningRules.delete(ruleId);
    setDeleting(null);
    onRefresh();
  };

  return (
    <div className="space-y-2 border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase">{category.category_name}</p>
            {category.description && <p className="text-[10px] text-slate-500 mt-0.5">{category.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          <Badge variant="outline" className="text-[10px]">
            {sortedRules.length} rule{sortedRules.length !== 1 ? "s" : ""}
          </Badge>
          {!category.is_active && <Badge className="text-[10px] bg-slate-200 text-slate-700">Inactive</Badge>}
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-3 border-t border-slate-200">
          {/* Rules Table */}
          {sortedRules.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Rule Name</th>
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Applies When</th>
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Planning Item</th>
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Type</th>
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Base Date</th>
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Offset</th>
                    <th className="text-left px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Req</th>
                    <th className="text-center px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRules.map(rule => (
                    <tr key={rule.id} className={`border-b border-slate-100 ${!rule.is_active ? "bg-slate-50 opacity-60" : ""}`}>
                      <td className="px-2 py-1 text-slate-800 font-medium">{rule.rule_name}</td>
                      <td className="px-2 py-1 text-slate-600 text-[10px]">
                        {formatAppliesToString(rule.applies_when_field, rule.applies_when_operator, rule.applies_when_value)}
                      </td>
                      <td className="px-2 py-1 text-slate-700">{rule.planning_item_name}</td>
                      <td className="px-2 py-1 text-slate-600">{getLabelForItemType(rule.planning_item_type)}</td>
                      <td className="px-2 py-1 text-slate-600 text-[10px]">{rule.base_date_type}</td>
                      <td className="px-2 py-1 text-slate-600 text-[10px]">
                        {formatDateOffsetString(rule.base_date_type, rule.offset_direction, rule.offset_days, rule.base_planning_rule_id)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {rule.required ? <span className="text-blue-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-2 py-1 text-center flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          onClick={() => setEditingRuleId(rule.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          disabled={toggling === rule.id}
                          onClick={() => handleToggleActive(rule.id, rule.is_active)}
                        >
                          {toggling === rule.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : rule.is_active ? (
                            <ToggleRight className="h-3 w-3 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-3 w-3 text-slate-300" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                          disabled={deleting === rule.id}
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          {deleting === rule.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sortedRules.length === 0 && (
            <p className="text-xs text-slate-400 italic">No rules in this category</p>
          )}

          {/* Edit / New Form */}
          {editingRuleId && (
            <PlanningRuleForm
              rule={sortedRules.find(r => r.id === editingRuleId)}
              categoryId={category.id}
              rules={sortedRules}
              onSaved={() => {
                setEditingRuleId(null);
                onRefresh();
              }}
              onCancel={() => setEditingRuleId(null)}
            />
          )}

          {showForm && !editingRuleId && (
            <PlanningRuleForm
              categoryId={category.id}
              rules={sortedRules}
              onSaved={() => {
                setShowForm(false);
                onRefresh();
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* Add Rule Button */}
          {!showForm && !editingRuleId && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1 text-xs h-7"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3 w-3" /> Add Planning Rule
            </Button>
          )}
        </div>
      )}
    </div>
  );
}