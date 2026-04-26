import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { minutesToDisplay } from "./workRulesUtils";
import TriggerValueForm from "./TriggerValueForm";
import WorkRuleForm from "./WorkRuleForm";

function WorkRulesTable({ triggerValue, rules, workItems, resources, onRefresh }) {
  const [editingRule, setEditingRule] = useState(null);
  const rulesForTv = rules
    .filter(r => r.trigger_value_id === triggerValue.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleToggleRule = async (rule) => {
    await base44.entities.StationLogWorkRules.update(rule.id, { is_active: !rule.is_active });
    onRefresh();
  };

  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete work rule "${rule.work_item_name_snapshot || rule.work_item_id}"?`)) return;
    await base44.entities.StationLogWorkRules.delete(rule.id);
    onRefresh();
  };

  return (
    <div className="ml-4 mt-1 border border-slate-100 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Work Item</th>
            <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Est. Time</th>
            <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Resource</th>
            <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Default</th>
            <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Status</th>
            <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {editingRule === "new" && (
            <WorkRuleForm
              categoryId={triggerValue.category_id}
              triggerValueId={triggerValue.id}
              triggerField={triggerValue._linked_field}
              triggerValue={triggerValue.trigger_value}
              workItems={workItems}
              resources={resources}
              existingRules={rules}
              opt={null}
              onSave={() => { onRefresh(); setEditingRule(null); }}
              onCancel={() => setEditingRule(null)}
            />
          )}
          {rulesForTv.length === 0 && editingRule !== "new" && (
            <tr>
              <td colSpan={6} className="px-3 py-3 text-center text-xs text-slate-400">
                No work rules yet. Click "+ Add Rule".
              </td>
            </tr>
          )}
          {rulesForTv.map(rule => (
            editingRule?.id === rule.id ? (
              <WorkRuleForm
                key={rule.id}
                categoryId={triggerValue.category_id}
                triggerValueId={triggerValue.id}
                triggerField={triggerValue._linked_field}
                triggerValue={triggerValue.trigger_value}
                workItems={workItems}
                resources={resources}
                existingRules={rules}
                opt={rule}
                onSave={() => { onRefresh(); setEditingRule(null); }}
                onCancel={() => setEditingRule(null)}
              />
            ) : (
              <tr key={rule.id} className={`hover:bg-slate-50 ${rule.is_active === false ? "opacity-50" : ""}`}>
                <td className="px-3 py-1.5 font-medium text-slate-700 text-xs">{rule.work_item_name_snapshot || workItems.find(w => w.id === rule.work_item_id)?.work_name || "—"}</td>
                <td className="px-3 py-1.5 font-mono text-slate-600 text-xs">{rule.estimated_time_display || minutesToDisplay(rule.estimated_time_minutes || 0)}</td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">{rule.resource_type_name_snapshot || resources.find(r => r.id === rule.resource_type_id)?.resource_name || "—"}</td>
                <td className="px-3 py-1.5">
                  <Badge className={`text-[10px] ${rule.default_selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                    {rule.default_selected ? "Yes" : "No"}
                  </Badge>
                </td>
                <td className="px-3 py-1.5">
                  <Badge className={`text-[10px] ${rule.is_active === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}`}>
                    {rule.is_active === false ? "Inactive" : "Active"}
                  </Badge>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingRule(rule)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className={`h-6 w-6 p-0 ${rule.is_active === false ? "text-green-600" : "text-slate-400 hover:text-orange-500"}`}
                      onClick={() => handleToggleRule(rule)}>
                      {rule.is_active === false ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => handleDeleteRule(rule)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 bg-white border-t border-slate-100">
        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1 text-blue-600 hover:text-blue-800 px-1"
          onClick={() => setEditingRule("new")}>
          <Plus className="h-3 w-3" /> Add Rule
        </Button>
      </div>
    </div>
  );
}

export default function TriggerValueSection({ triggerValue, rules, workItems, resources, dropdownOptions, linkedField, fieldType, allTriggerValues = [], onRefresh }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);

  // Inject _linked_field so WorkRuleForm can use it
  const tvWithField = { ...triggerValue, _linked_field: linkedField };

  const rulesCount = rules.filter(r => r.trigger_value_id === triggerValue.id).length;

  const handleDelete = async () => {
    if (rulesCount > 0) {
      if (!window.confirm(`This trigger value has ${rulesCount} work rule(s). Delete it and all its rules?`)) return;
      const rulesForTv = rules.filter(r => r.trigger_value_id === triggerValue.id);
      await Promise.all(rulesForTv.map(r => base44.entities.StationLogWorkRules.delete(r.id)));
    } else {
      if (!window.confirm(`Delete trigger value "${triggerValue.trigger_value}"?`)) return;
    }
    await base44.entities.StationLogWorkRuleTriggerValues.delete(triggerValue.id);
    onRefresh();
  };

  const handleToggle = async () => {
    await base44.entities.StationLogWorkRuleTriggerValues.update(triggerValue.id, { is_active: !triggerValue.is_active });
    onRefresh();
  };

  if (editing) {
    return (
      <TriggerValueForm
        categoryId={triggerValue.category_id}
        fieldType={fieldType}
        dropdownOptions={dropdownOptions}
        linkedField={linkedField}
        existingTriggerValues={allTriggerValues}
        opt={triggerValue}
        onSave={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${triggerValue.is_active === false ? "border-slate-200 opacity-60" : "border-slate-300"}`}>
      {/* Trigger Value Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-150">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-1.5 flex-1 text-left">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-700">
            {triggerValue.display_label && triggerValue.display_label !== triggerValue.trigger_value
              ? triggerValue.display_label
              : triggerValue.trigger_value}
          </span>
          {triggerValue.display_label && triggerValue.display_label !== triggerValue.trigger_value && (
            <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1 rounded">{triggerValue.trigger_value}</span>
          )}
          <span className="text-[10px] bg-white border border-slate-200 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold ml-1">{rulesCount} rule{rulesCount !== 1 ? "s" : ""}</span>
          {triggerValue.is_active === false && <Badge className="text-[10px] bg-slate-200 text-slate-500 ml-1">Inactive</Badge>}
        </button>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost"
            className={`h-6 w-6 p-0 ${triggerValue.is_active === false ? "text-green-600" : "text-slate-400 hover:text-orange-500"}`}
            onClick={handleToggle}>
            {triggerValue.is_active === false ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Work Rules Table */}
      {!collapsed && (
        <div className="p-2 bg-white">
          <WorkRulesTable
            triggerValue={tvWithField}
            rules={rules}
            workItems={workItems}
            resources={resources}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}