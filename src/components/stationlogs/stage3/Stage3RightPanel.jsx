import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Loader2 } from "lucide-react";
import { determineItemStatus } from "./stage3Utils";

export default function Stage3RightPanel({
  log,
  stationData,
  savedItems,
  suggestions,
  onSuggestionAdded,
  onItemRemoved,
  onItemUpdated,
  onAddManual,
  onDatesSaved,
}) {
  const [executionDate, setExecutionDate] = useState(stationData?.execution_date || stationData?.stage_3_execution_date || "");
  const [executionFinish, setExecutionFinish] = useState(stationData?.execution_finish || stationData?.stage_3_execution_finish || "");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    type: "Deadline",
    stage: "",
    date: "",
    required: true,
    notes: "",
  });
  const [addingMap, setAddingMap] = useState({});
  const [savingDates, setSavingDates] = useState(false);

  const handleSaveDates = async () => {
    setSavingDates(true);
    try {
      await base44.entities.StationLog.update(log.id, {
        stage_3_execution_date: executionDate || null,
        stage_3_execution_finish: executionFinish || null,
      });
      // Notify parent to update local state and recalculate suggestions
      if (onDatesSaved) {
        onDatesSaved(executionDate, executionFinish);
      }
    } catch (err) {
      alert(`Error saving dates: ${err.message}`);
    } finally {
      setSavingDates(false);
    }
  };

  const handleAddSuggestion = async (suggestion) => {
    // Validate rule can be added
    if (suggestion.status !== "Suggested") {
      alert("This rule cannot be added. Please check the status.");
      return;
    }
    if (suggestion.validationWarning) {
      alert(`Cannot add: ${suggestion.validationWarning}`);
      return;
    }
    if (!suggestion.calculated_date) {
      alert("Error: Missing calculated date in suggestion.");
      return;
    }
    if (!suggestion.output_date_key) {
      alert("Error: Missing output_date_key. Rule is not properly configured. Please edit the rule to add an Output Date Key.");
      return;
    }
    if (!suggestion.output_flow_stage_id) {
      alert("Error: Missing output_flow_stage_id. Rule is not properly configured. Please edit the rule to set the Flow Stage.");
      return;
    }

    // Set loading state for this specific rule
    setAddingMap(prev => ({ ...prev, [suggestion.rule_id]: true }));

    try {
      const newItem = {
        station_log_id: log.id,
        stage1_version_id: log.active_version_id,
        source: "Rule",
        planning_rule_id: suggestion.rule_id,
        planning_rule_name_snapshot: suggestion.rule_name,
        output_date_key: suggestion.output_date_key,
        output_flow_stage_id: suggestion.output_flow_stage_id,
        output_flow_stage_name: suggestion.output_flow_stage_name,
        planning_item_name_snapshot: suggestion.planning_item_name,
        planning_item_type: suggestion.planning_item_type,
        base_date_key: suggestion.base_date_key,
        calculated_date: suggestion.calculated_date,
        planned_date: suggestion.calculated_date,
        status: determineItemStatus(suggestion.calculated_date),
        required: suggestion.required,
      };
      await base44.entities.StationLogStage3PlanningItems.create(newItem);
      onSuggestionAdded();
    } catch (err) {
      alert(`Error adding suggestion: ${err.message}`);
    } finally {
      setAddingMap(prev => ({ ...prev, [suggestion.rule_id]: false }));
    }
  };

  const handleAddManualSubmit = async () => {
    if (!manualForm.name.trim() || !manualForm.date) {
      alert("Name and date are required");
      return;
    }
    const newItem = {
      station_log_id: log.id,
      stage1_version_id: log.active_version_id,
      source: "Manual",
      output_date_key: `manual_${Date.now()}`,
      output_flow_stage_id: Number(manualForm.stage),
      output_flow_stage_name: `Stage ${Number(manualForm.stage)}`,
      planning_item_name_snapshot: manualForm.name,
      planning_item_type: manualForm.type,
      planned_date: manualForm.date,
      status: determineItemStatus(manualForm.date),
      required: manualForm.required,
      notes: manualForm.notes,
    };
    await base44.entities.StationLogStage3PlanningItems.create(newItem);
    setManualForm({ name: "", type: "Deadline", stage: "", date: "", required: true, notes: "" });
    setShowManualForm(false);
    onAddManual();
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("Remove this planning item?")) return;
    await base44.entities.StationLogStage3PlanningItems.update(itemId, { is_active: false });
    onItemRemoved();
  };

  const handleMarkCompleted = async (item) => {
    await base44.entities.StationLogStage3PlanningItems.update(item.id, {
      status: item.status === "Completed" ? "Planned" : "Completed",
      actual_date: item.status === "Completed" ? null : new Date().toISOString().split("T")[0],
    });
    onItemUpdated();
  };

  // Check if execution dates are set
  const hasExecutionDates = stationData?.execution_date && stationData?.execution_finish;

  // Group saved items by stage
  const groupedSaved = savedItems.reduce((acc, item) => {
    const stage = item.output_flow_stage_id;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(item);
    return acc;
  }, {});

  const typeColors = {
    Deadline: "bg-red-100 text-red-700",
    "Planned Date": "bg-blue-100 text-blue-700",
    Milestone: "bg-purple-100 text-purple-700",
    Task: "bg-green-100 text-green-700",
  };

  const statusColors = {
    "Not Due": "text-slate-600",
    "Due Soon": "text-amber-600",
    "Due Today": "text-orange-600",
    Overdue: "text-red-600",
    Planned: "text-blue-600",
    Completed: "text-green-600",
    Blocked: "text-red-600",
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-4">
      {/* Warning: Execution Dates Required */}
      {!hasExecutionDates && suggestions.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold">Set Execution Dates First</p>
            <p>Rules need "Start Date" and "Finish Date" to calculate planning items.</p>
          </div>
        </div>
      )}

      {/* Execution Dates */}
      <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase">Execution Dates</h3>
        <div className="space-y-1.5">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Start Date</label>
            <Input
              type="date"
              value={executionDate}
              onChange={e => setExecutionDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Finish Date</label>
            <Input
              type="date"
              value={executionFinish}
              onChange={e => setExecutionFinish(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            disabled={savingDates}
            onClick={handleSaveDates}
          >
            {savingDates ? "Saving..." : "Save Dates"}
          </Button>
        </div>
      </div>

      {/* Saved Planning Items */}
      <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600 uppercase">Saved Planning Items</h3>
          <Badge variant="outline" className="text-[10px]">{savedItems.length}</Badge>
        </div>
        <p className="text-[10px] text-slate-500">Official planning outputs. Edit dates, mark completed, or remove as needed.</p>

        {savedItems.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            No saved planning items yet. Add from suggestions or create manually.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedSaved)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([stage, items]) => (
                <div key={stage} className="space-y-1.5 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Stage {stage}</p>
                  {items.map(item => (
                    <div key={item.id} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{item.planning_item_name_snapshot}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <Badge className={`${typeColors[item.planning_item_type]} text-[9px]`}>
                              {item.planning_item_type}
                            </Badge>
                            <Badge variant="outline" className={`text-[9px] ${statusColors[item.status]}`}>
                              {item.status}
                            </Badge>
                            {item.required && <Badge className="bg-slate-200 text-slate-700 text-[9px]">Required</Badge>}
                            {item.source === "Manual" && <Badge variant="outline" className="text-[9px]">Manual</Badge>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleMarkCompleted(item)}
                          className="flex-shrink-0 mt-0.5"
                        >
                          <Check className={`h-4 w-4 ${item.status === "Completed" ? "text-green-600" : "text-slate-300"}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="date"
                          value={item.planned_date || ""}
                          onChange={e => onItemUpdated(item.id, { planned_date: e.target.value })}
                          className="h-6 text-xs flex-1 min-w-fit"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {item.notes && <p className="text-[10px] text-slate-500 italic">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Manual Item */}
      <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
        {!showManualForm ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1 h-8 text-xs"
            onClick={() => setShowManualForm(true)}
          >
            <Plus className="h-3 w-3" /> Add Manual Item
          </Button>
        ) : (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-600 uppercase">New Manual Item</h3>
            <Input
              placeholder="Item name"
              value={manualForm.name}
              onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={manualForm.type}
                onChange={e => setManualForm(f => ({ ...f, type: e.target.value }))}
                className="h-8 text-sm border border-slate-200 rounded px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option>Deadline</option>
                <option>Planned Date</option>
                <option>Milestone</option>
                <option>Task</option>
              </select>
              <select
                value={manualForm.stage}
                onChange={e => setManualForm(f => ({ ...f, stage: e.target.value }))}
                className="h-8 text-sm border border-slate-200 rounded px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">— Stage —</option>
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(s => (
                  <option key={s} value={s}>Stage {s}</option>
                ))}
              </select>
            </div>
            <Input
              type="date"
              value={manualForm.date}
              onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Notes (optional)"
              value={manualForm.notes}
              onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))}
              className="h-8 text-sm"
            />
            <label className="text-[10px] flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manualForm.required}
                onChange={e => setManualForm(f => ({ ...f, required: e.target.checked }))}
              />
              <span>Required</span>
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => setShowManualForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={handleAddManualSubmit}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Rule Suggestions */}
      <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600 uppercase">Rule Suggestions</h3>
          <Badge variant="outline" className="text-[10px]">{suggestions.length}</Badge>
        </div>
        <p className="text-[10px] text-slate-500">Generated from current dates. Not saved until added.</p>

        {suggestions.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            No new suggestions. All rule suggestions are already saved.
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map(sugg => {
              // Debug: log suggestion object
              console.log("Suggestion:", sugg);
              return (
              <div
                key={sugg.output_date_key}
                className={`p-2 rounded border ${
                  sugg.status === "Blocked" ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"
                } space-y-1`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{sugg.planning_item_name}</p>
                    <p className="text-[10px] text-slate-500">{sugg.rule_name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <Badge className={`${typeColors[sugg.planning_item_type]} text-[9px]`}>
                        {sugg.planning_item_type}
                      </Badge>
                      {sugg.required && <Badge className="bg-slate-200 text-slate-700 text-[9px]">Required</Badge>}
                    </div>
                  </div>
                </div>

                {sugg.validationWarning ? (
                   <div className="flex items-start gap-2 p-1.5 bg-red-50 border border-red-200 rounded text-red-700 text-[10px]">
                     <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                     <span>{sugg.validationWarning}</span>
                   </div>
                 ) : (
                   <div className="grid grid-cols-2 gap-2 text-[10px]">
                     <div>
                       <p className="text-slate-500 font-semibold">Base</p>
                       <p className="text-slate-800 font-mono">{sugg.base_date_key}</p>
                     </div>
                     <div>
                       <p className="text-slate-500 font-semibold">Calculated</p>
                       <p className="text-slate-800 font-mono">{sugg.calculated_date}</p>
                     </div>
                   </div>
                 )}

                <Button
                   size="sm"
                   className="w-full h-7 text-xs gap-1"
                   disabled={
                     addingMap[sugg.rule_id] ||
                     sugg.status !== "Suggested" ||
                     !!sugg.validationWarning
                   }
                   onClick={() => handleAddSuggestion(sugg)}
                 >
                   {addingMap[sugg.rule_id] ? (
                     <>
                       <Loader2 className="h-3 w-3 animate-spin" />
                       Adding...
                     </>
                   ) : (
                     <>
                       <Plus className="h-3 w-3" />
                       Add
                     </>
                   )}
                 </Button>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}