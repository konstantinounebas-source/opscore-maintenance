import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import CategoryForm from "./CategoryForm";
import TriggerValueForm from "./TriggerValueForm";
import TriggerValueSection from "./TriggerValueSection";

export default function CategoryCard({ category, triggerValues, rules, workItems, resources, dropdownOptions, onRefresh }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingTrigger, setAddingTrigger] = useState(false);

  const myTriggerValues = triggerValues
    .filter(tv => tv.category_id === category.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const myRulesCount = rules.filter(r => r.category_id === category.id).length;

  const handleDelete = async () => {
    const hasData = myTriggerValues.length > 0 || myRulesCount > 0;
    if (hasData) {
      if (!window.confirm(
        `Category "${category.category_name}" has ${myTriggerValues.length} trigger value(s) and ${myRulesCount} work rule(s).\n\nDeactivating is recommended instead of deleting. Do you still want to permanently delete everything?`
      )) return;
      // Delete all rules then trigger values
      const myRules = rules.filter(r => r.category_id === category.id);
      await Promise.all(myRules.map(r => base44.entities.StationLogWorkRules.delete(r.id)));
      await Promise.all(myTriggerValues.map(tv => base44.entities.StationLogWorkRuleTriggerValues.delete(tv.id)));
    } else {
      if (!window.confirm(`Delete category "${category.category_name}"?`)) return;
    }
    await base44.entities.StationLogWorkRuleCategories.delete(category.id);
    onRefresh();
  };

  const handleToggle = async () => {
    await base44.entities.StationLogWorkRuleCategories.update(category.id, { is_active: !category.is_active });
    onRefresh();
  };

  if (editing) {
    return (
      <CategoryForm
        opt={category}
        onSave={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${category.is_active === false ? "border-slate-200 opacity-70" : "border-slate-300"}`}>
      {/* Category Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 flex-1 text-left">
          {collapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800">{category.category_name}</span>
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 font-mono">{category.linked_stage1_field}</Badge>
              <Badge className="text-[10px] bg-slate-200 text-slate-600">{category.field_type}</Badge>
              {category.is_active === false && <Badge className="text-[10px] bg-slate-300 text-slate-600">Inactive</Badge>}
              <span className="text-[10px] text-slate-400">{myTriggerValues.length} trigger{myTriggerValues.length !== 1 ? "s" : ""} · {myRulesCount} rule{myRulesCount !== 1 ? "s" : ""}</span>
            </div>
            {category.description && <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>}
          </div>
        </button>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost"
            className={`h-7 w-7 p-0 ${category.is_active === false ? "text-green-600" : "text-slate-400 hover:text-orange-500"}`}
            onClick={handleToggle}>
            {category.is_active === false ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Category Body */}
      {!collapsed && (
        <div className="p-3 bg-white space-y-2">
          {/* Add Trigger Value form */}
          {addingTrigger && (
            <TriggerValueForm
              categoryId={category.id}
              fieldType={category.field_type}
              dropdownOptions={dropdownOptions}
              linkedField={category.linked_stage1_field}
              opt={null}
              onSave={() => { setAddingTrigger(false); onRefresh(); }}
              onCancel={() => setAddingTrigger(false)}
            />
          )}

          {/* Trigger Values */}
          {myTriggerValues.length === 0 && !addingTrigger && (
            <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">
              No trigger values yet. Add a value to start defining work rules.
            </p>
          )}
          {myTriggerValues.map(tv => (
            <TriggerValueSection
              key={tv.id}
              triggerValue={tv}
              rules={rules}
              workItems={workItems}
              resources={resources}
              dropdownOptions={dropdownOptions}
              linkedField={category.linked_stage1_field}
              fieldType={category.field_type}
              onRefresh={onRefresh}
            />
          ))}

          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs w-full border-dashed"
            onClick={() => setAddingTrigger(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Trigger Value
          </Button>
        </div>
      )}
    </div>
  );
}