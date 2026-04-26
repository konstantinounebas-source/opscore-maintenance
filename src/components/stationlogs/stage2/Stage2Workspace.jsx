import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import Stage2LeftPanel from "./Stage2LeftPanel";
import Stage2RightPanel from "./Stage2RightPanel";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";

function calcPlanningStatus(rows) {
  const selected = rows.filter(r => r.selected);
  if (selected.length === 0) return "Incomplete";
  if (selected.some(r => !r.resource_type_id)) return "Incomplete";
  if (selected.some(r => (r.total_minutes || 0) <= 0)) return "Incomplete";
  return "Ready for Planning";
}

function buildResourceBreakdown(rows) {
  const selected = rows.filter(r => r.selected);
  const map = {};
  for (const r of selected) {
    const key = r.resource_type_id || "__none__";
    if (!map[key]) map[key] = { resource_type_id: r.resource_type_id, name: r.resource_type_name_snapshot || "Unknown Resource", count: 0, total_minutes: 0 };
    map[key].count += 1;
    map[key].total_minutes += r.total_minutes || 0;
  }
  return Object.values(map).map(g => ({ ...g, display: minutesToDisplay(g.total_minutes) }));
}

export default function Stage2Workspace({ log, currentData, attachments, onClose, onCompleted }) {
  const queryClient = useQueryClient();
  const stationLogId = log.id;

  // Load all rule reference data
  const { data: categories = [] } = useQuery({
    queryKey: ["wrc_cats"],
    queryFn: () => base44.entities.StationLogWorkRuleCategories.list(),
    select: d => d.filter(c => c.is_active !== false),
  });
  const { data: triggerValues = [] } = useQuery({
    queryKey: ["wrc_tvs"],
    queryFn: () => base44.entities.StationLogWorkRuleTriggerValues.list(),
    select: d => d.filter(t => t.is_active !== false),
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["wrc_rules"],
    queryFn: () => base44.entities.StationLogWorkRules.list(),
    select: d => d.filter(r => r.is_active !== false),
  });
  const { data: workItems = [] } = useQuery({
    queryKey: ["stationLogWorkItems"],
    queryFn: () => base44.entities.StationLogWorkItems.list(),
    select: d => d.filter(i => i.is_active !== false),
  });
  const { data: resources = [] } = useQuery({
    queryKey: ["stationLogResourceTypes"],
    queryFn: () => base44.entities.StationLogResourceTypes.list(),
    select: d => d.filter(r => r.is_active !== false),
  });

  // Existing saved allocations for this station log
  const { data: savedAllocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ["stage2alloc", stationLogId],
    queryFn: () => base44.entities.StationLogStage2WorkAllocations.filter({ station_log_id: stationLogId }),
  });

  const [rows, setRows] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Build auto-suggested rows from rules when data is ready
  useEffect(() => {
    if (allocLoading || !categories.length) return;

    if (savedAllocations.length > 0) {
      // Load from saved
      setRows(savedAllocations.map(a => ({ ...a, _key: a.id })));
      setInitialized(true);
      return;
    }

    if (!currentData) { setInitialized(true); return; }

    const autoRows = [];
    let sortIdx = 0;
    for (const cat of categories.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
      const fieldValue = currentData[cat.linked_stage1_field];
      if (!fieldValue) continue;
      const matchingTVs = triggerValues.filter(
        tv => tv.category_id === cat.id && tv.trigger_value === String(fieldValue)
      );
      for (const tv of matchingTVs) {
        const matchingRules = rules.filter(r => r.trigger_value_id === tv.id);
        for (const rule of matchingRules.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
          autoRows.push({
            _key: `auto_${rule.id}`,
            station_log_id: stationLogId,
            stage1_version_id: currentData.active_version_id || null,
            category_id: cat.id,
            category_name_snapshot: cat.category_name,
            trigger_value_id: tv.id,
            trigger_value_snapshot: tv.display_label || tv.trigger_value,
            source: "Auto",
            work_item_id: rule.work_item_id,
            work_name_snapshot: rule.work_item_name_snapshot || "",
            resource_type_id: rule.resource_type_id || "",
            resource_type_name_snapshot: rule.resource_type_name_snapshot || "",
            base_minutes: rule.estimated_time_minutes || 0,
            extra_minutes: 0,
            total_minutes: rule.estimated_time_minutes || 0,
            selected: rule.default_selected !== false,
            notes: "",
            sort_order: sortIdx++,
            is_active: true,
          });
        }
      }
    }
    setRows(autoRows);
    setInitialized(true);
  }, [allocLoading, savedAllocations, categories, triggerValues, rules, currentData]);

  const updateRow = useCallback((key, changes) => {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      const updated = { ...r, ...changes };
      updated.total_minutes = (Number(updated.base_minutes) || 0) + (Number(updated.extra_minutes) || 0);
      return updated;
    }));
  }, []);

  const removeRow = useCallback((key) => {
    setRows(prev => prev.filter(r => r._key !== key));
  }, []);

  const addTemplateRow = useCallback((workItem, resourceId, resourceName, baseMinutes) => {
    const key = `template_${Date.now()}`;
    setRows(prev => [...prev, {
      _key: key,
      station_log_id: stationLogId,
      stage1_version_id: currentData?.active_version_id || null,
      category_id: null,
      category_name_snapshot: "Additional Template Work",
      trigger_value_id: null,
      trigger_value_snapshot: "Manual selection",
      source: "Template",
      work_item_id: workItem.id,
      work_name_snapshot: workItem.work_name,
      resource_type_id: resourceId || "",
      resource_type_name_snapshot: resourceName || "",
      base_minutes: baseMinutes || 0,
      extra_minutes: 0,
      total_minutes: baseMinutes || 0,
      selected: true,
      notes: "",
      sort_order: 9999,
      is_active: true,
    }]);
  }, [stationLogId, currentData]);

  const addManualRow = useCallback((workName, resourceId, resourceName, baseMinutes, notes) => {
    const key = `manual_${Date.now()}`;
    setRows(prev => [...prev, {
      _key: key,
      station_log_id: stationLogId,
      stage1_version_id: currentData?.active_version_id || null,
      category_id: null,
      category_name_snapshot: "Manual Work",
      trigger_value_id: null,
      trigger_value_snapshot: "Not in template",
      source: "Manual",
      work_item_id: null,
      work_name_snapshot: workName,
      resource_type_id: resourceId || "",
      resource_type_name_snapshot: resourceName || "",
      base_minutes: baseMinutes || 0,
      extra_minutes: 0,
      total_minutes: baseMinutes || 0,
      selected: true,
      notes: notes || "",
      sort_order: 9999,
      is_active: true,
    }]);
  }, [stationLogId, currentData]);

  const planningStatus = calcPlanningStatus(rows);
  const totalMinutes = rows.filter(r => r.selected).reduce((s, r) => s + (r.total_minutes || 0), 0);
  const resourceBreakdown = buildResourceBreakdown(rows);

  const handleSave = async () => {
    setSaving(true);
    // Delete existing and re-insert
    const existing = await base44.entities.StationLogStage2WorkAllocations.filter({ station_log_id: stationLogId });
    await Promise.all(existing.map(e => base44.entities.StationLogStage2WorkAllocations.delete(e.id)));

    const toCreate = rows.map(({ _key, ...r }) => ({
      ...r,
      total_minutes: (Number(r.base_minutes) || 0) + (Number(r.extra_minutes) || 0),
    }));
    if (toCreate.length > 0) {
      await base44.entities.StationLogStage2WorkAllocations.bulkCreate(toCreate);
    }

    // Update StationLog summary (non-completing save)
    await base44.entities.StationLog.update(stationLogId, {
      stage_2_planning_status: planningStatus,
      stage_2_total_minutes: totalMinutes,
      stage_2_resource_breakdown_json: JSON.stringify(resourceBreakdown),
    });

    queryClient.invalidateQueries({ queryKey: ["stage2alloc", stationLogId] });
    queryClient.invalidateQueries({ queryKey: ["stationLogs"] });
    setSaving(false);
  };

  const handleComplete = async () => {
    if (planningStatus !== "Ready for Planning") return;
    setSaving(true);
    const user = await base44.auth.me();

    // Save allocations
    const existing = await base44.entities.StationLogStage2WorkAllocations.filter({ station_log_id: stationLogId });
    await Promise.all(existing.map(e => base44.entities.StationLogStage2WorkAllocations.delete(e.id)));
    const toCreate = rows.map(({ _key, ...r }) => ({
      ...r,
      total_minutes: (Number(r.base_minutes) || 0) + (Number(r.extra_minutes) || 0),
    }));
    if (toCreate.length > 0) {
      await base44.entities.StationLogStage2WorkAllocations.bulkCreate(toCreate);
    }

    // Update StationLog — complete Stage 2 and advance to Stage 3
    await base44.entities.StationLog.update(stationLogId, {
      stage_2_completed: true,
      stage_2_completed_at: new Date().toISOString(),
      stage_2_completed_by: user?.email || "",
      stage_2_planning_status: "Ready for Planning",
      stage_2_total_minutes: totalMinutes,
      stage_2_resource_breakdown_json: JSON.stringify(resourceBreakdown),
      current_stage: log.current_stage <= 2 ? 3 : log.current_stage,
      current_status: "In Progress",
    });

    queryClient.invalidateQueries({ queryKey: ["stage2alloc", stationLogId] });
    queryClient.invalidateQueries({ queryKey: ["stationLogs"] });
    setSaving(false);
    onCompleted && onCompleted();
  };

  if (!initialized || allocLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-600">Loading Stage 2 Workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">2</div>
          <div>
            <p className="font-bold text-slate-900 text-base">Stage 2 — Work Categorization & Time Estimation</p>
            <p className="text-xs text-slate-500">{log.id} · {currentData?.bus_stop_name || currentData?.location_address || "Bus Stop"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Planning status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            planningStatus === "Ready for Planning"
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}>
            {planningStatus === "Ready for Planning"
              ? <CheckCircle className="h-3.5 w-3.5" />
              : <AlertCircle className="h-3.5 w-3.5" />}
            {planningStatus}
          </div>
          {/* Total time */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-mono text-slate-700">
            <Clock className="h-3.5 w-3.5" />
            {minutesToDisplay(totalMinutes)} total
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Draft"}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
            disabled={planningStatus !== "Ready for Planning" || saving}
            onClick={handleComplete}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Complete Stage 2 →"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Stage 1 Verification */}
        <div className="w-[380px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
          <Stage2LeftPanel
            log={log}
            currentData={currentData}
            attachments={attachments}
            stationLogId={stationLogId}
          />
        </div>

        {/* Right: Work Allocation */}
        <div className="flex-1 overflow-y-auto bg-white">
          <Stage2RightPanel
            rows={rows}
            resources={resources}
            workItems={workItems}
            rules={rules}
            categories={categories}
            triggerValues={triggerValues}
            resourceBreakdown={resourceBreakdown}
            totalMinutes={totalMinutes}
            planningStatus={planningStatus}
            onUpdateRow={updateRow}
            onRemoveRow={removeRow}
            onAddTemplate={addTemplateRow}
            onAddManual={addManualRow}
          />
        </div>
      </div>
    </div>
  );
}