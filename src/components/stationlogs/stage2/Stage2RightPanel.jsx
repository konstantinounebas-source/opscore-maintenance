import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronRight
} from "lucide-react";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";
import AddTemplateWorkDialog from "./AddTemplateWorkDialog";
import AddManualWorkDialog from "./AddManualWorkDialog";

const SOURCE_COLORS = {
  Auto: "bg-blue-100 text-blue-700",
  Template: "bg-purple-100 text-purple-700",
  Manual: "bg-orange-100 text-orange-700",
};

function groupRows(rows) {
  const groups = {};
  for (const row of rows) {
    const catKey = row.category_name_snapshot || "Uncategorized";
    const tvKey = row.trigger_value_snapshot || "—";
    const gKey = `${catKey}|||${tvKey}`;
    if (!groups[gKey]) groups[gKey] = { category: catKey, triggerValue: tvKey, rows: [] };
    groups[gKey].rows.push(row);
  }
  return Object.values(groups);
}

function AllocationRow({ row, resources, onUpdate, onRemove }) {
  return (
    <tr className={`border-b border-slate-100 text-xs ${!row.selected ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"}`}>
      {/* Checkbox */}
      <td className="px-3 py-2 w-8">
        <input
          type="checkbox"
          checked={row.selected}
          onChange={e => onUpdate(row._key, { selected: e.target.checked })}
          className="rounded"
        />
      </td>

      {/* Work Item */}
      <td className="px-2 py-2 min-w-[140px]">
        <span className="font-medium text-slate-800">{row.work_name_snapshot}</span>
      </td>

      {/* Source */}
      <td className="px-2 py-2 w-20">
        <Badge className={`text-[10px] ${SOURCE_COLORS[row.source] || "bg-slate-100 text-slate-600"}`}>
          {row.source}
        </Badge>
      </td>

      {/* Resource Type */}
      <td className="px-2 py-2 min-w-[130px]">
        <select
          className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white"
          value={row.resource_type_id || ""}
          onChange={e => {
            const res = resources.find(r => r.id === e.target.value);
            onUpdate(row._key, {
              resource_type_id: e.target.value,
              resource_type_name_snapshot: res?.resource_name || "",
            });
          }}
        >
          <option value="">— select —</option>
          {resources.map(r => <option key={r.id} value={r.id}>{r.resource_name}</option>)}
        </select>
        {!row.resource_type_id && row.selected && (
          <p className="text-[10px] text-red-500 mt-0.5">Required</p>
        )}
      </td>

      {/* Base Time */}
      <td className="px-2 py-2 w-20">
        <span className="font-mono text-slate-600">{minutesToDisplay(row.base_minutes)}</span>
      </td>

      {/* Extra Time */}
      <td className="px-2 py-2 w-28">
        <div className="flex gap-1 items-center">
          <Input
            type="number"
            min={0}
            className="h-6 w-10 text-xs px-1 font-mono"
            placeholder="h"
            value={Math.floor((row.extra_minutes || 0) / 60)}
            onChange={e => {
              const h = Number(e.target.value) || 0;
              const m = (row.extra_minutes || 0) % 60;
              onUpdate(row._key, { extra_minutes: h * 60 + m });
            }}
          />
          <Input
            type="number"
            min={0}
            max={59}
            className="h-6 w-10 text-xs px-1 font-mono"
            placeholder="m"
            value={(row.extra_minutes || 0) % 60}
            onChange={e => {
              const h = Math.floor((row.extra_minutes || 0) / 60);
              const m = Number(e.target.value) || 0;
              onUpdate(row._key, { extra_minutes: h * 60 + m });
            }}
          />
        </div>
      </td>

      {/* Total Time */}
      <td className="px-2 py-2 w-20">
        <span className={`font-mono font-semibold ${row.selected && (row.total_minutes || 0) <= 0 ? "text-red-500" : "text-slate-800"}`}>
          {minutesToDisplay(row.total_minutes || 0)}
        </span>
      </td>

      {/* Notes */}
      <td className="px-2 py-2 min-w-[120px]">
        <Input
          className="h-6 text-xs"
          placeholder="notes…"
          value={row.notes || ""}
          onChange={e => onUpdate(row._key, { notes: e.target.value })}
        />
      </td>

      {/* Actions */}
      <td className="px-2 py-2 w-10">
        {row.source !== "Auto" && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
            onClick={() => onRemove(row._key)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function GroupBlock({ group, resources, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true);
  const selectedCount = group.rows.filter(r => r.selected).length;
  const groupMinutes = group.rows.filter(r => r.selected).reduce((s, r) => s + (r.total_minutes || 0), 0);

  return (
    <div className="mb-1">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-t text-left"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
        <span className="text-xs font-bold text-slate-700">{group.category}</span>
        <span className="text-[10px] text-slate-400 mx-1">→</span>
        <span className="text-xs text-slate-600 italic">{group.triggerValue}</span>
        <span className="ml-auto text-[10px] text-slate-400">
          {selectedCount}/{group.rows.length} selected · {minutesToDisplay(groupMinutes)}
        </span>
      </button>
      {open && (
        <div className="border border-t-0 border-slate-200 rounded-b overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <th className="px-3 py-1.5 w-8"></th>
                <th className="px-2 py-1.5 text-left">Work Item</th>
                <th className="px-2 py-1.5 text-left w-20">Source</th>
                <th className="px-2 py-1.5 text-left min-w-[130px]">Resource Type</th>
                <th className="px-2 py-1.5 text-left w-20">Base</th>
                <th className="px-2 py-1.5 text-left w-28">Extra (h m)</th>
                <th className="px-2 py-1.5 text-left w-20">Total</th>
                <th className="px-2 py-1.5 text-left min-w-[120px]">Notes</th>
                <th className="px-2 py-1.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map(row => (
                <AllocationRow
                  key={row._key}
                  row={row}
                  resources={resources}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Stage2RightPanel({
  rows, resources, workItems, rules = [], categories = [], triggerValues = [],
  resourceBreakdown, totalMinutes, planningStatus,
  onUpdateRow, onRemoveRow, onAddTemplate, onAddManual,
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const groups = groupRows(rows);
  const selectedRows = rows.filter(r => r.selected);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div>
          <p className="text-sm font-bold text-slate-800">Work Allocation</p>
          <p className="text-xs text-slate-500">{selectedRows.length} works selected · {minutesToDisplay(totalMinutes)} total</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowTemplate(true)}>
            <Plus className="h-3.5 w-3.5" /> Add from Template
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowManual(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Manual Work
          </Button>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto p-4">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No works matched from Stage 1 data.</p>
            <p className="text-xs mt-1">Add template or manual works using the buttons above.</p>
          </div>
        ) : (
          groups.map((g, i) => (
            <GroupBlock
              key={i}
              group={g}
              resources={resources}
              onUpdate={onUpdateRow}
              onRemove={onRemoveRow}
            />
          ))
        )}
      </div>

      {/* Resource Breakdown Summary */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Resource Breakdown</p>
        {resourceBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400">No selected works.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resourceBreakdown.map((rb, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">{rb.name}</span>
                <span className="text-[10px] text-slate-400">— {rb.count} work{rb.count !== 1 ? "s" : ""}</span>
                <span className="text-xs font-mono text-slate-800 ml-1">{rb.display}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showTemplate && (
        <AddTemplateWorkDialog
          workItems={workItems}
          resources={resources}
          rules={rules}
          categories={categories}
          triggerValues={triggerValues}
          onAdd={onAddTemplate}
          onClose={() => setShowTemplate(false)}
        />
      )}
      {showManual && (
        <AddManualWorkDialog
          resources={resources}
          onAdd={onAddManual}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}