import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, AlertCircle, Clock, ChevronDown, ChevronRight,
  Info, X, Eye
} from "lucide-react";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";
import AddTemplateWorkDialog from "./AddTemplateWorkDialog";
import AddManualWorkDialog from "./AddManualWorkDialog";
import ReviewChangesModal from "./ReviewChangesModal";

// ── Source badge (outline, neutral) ───────────────────────────────────────────
function SourceBadge({ source }) {
  return (
    <span className="text-[10px] border border-slate-300 text-slate-500 rounded px-1.5 py-0.5 font-medium">
      {source}
    </span>
  );
}

// ── Rule Change Banner (calm, compact) ────────────────────────────────────────
function RuleChangeBanner({ ruleDiff, onReview, onApplyAll, onDismiss }) {
  const newCount = ruleDiff?.newSuggestions?.length ?? 0;
  const outdatedCount = ruleDiff?.noLongerMatching?.length ?? 0;
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200 flex-wrap">
      <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <p className="text-xs text-slate-600 flex-1">Stage 1 data changed. Review updated rule suggestions.</p>
      <div className="flex items-center gap-1.5">
        {newCount > 0 && (
          <span className="text-[10px] border border-amber-400 text-amber-700 rounded-full px-2 py-0.5 font-medium">
            {newCount} new suggestion{newCount !== 1 ? "s" : ""}
          </span>
        )}
        {outdatedCount > 0 && (
          <span className="text-[10px] border border-amber-400 text-red-600 rounded-full px-2 py-0.5 font-medium">
            {outdatedCount} outdated saved work{outdatedCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex gap-1.5 items-center">
        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={onReview}>
          <Eye className="h-3 w-3 mr-1" /> Review
        </Button>
        {newCount > 0 && (
          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 border-amber-400 text-red-600 hover:bg-amber-50" onClick={onApplyAll}>
            <Plus className="h-3 w-3 mr-1" /> Apply New
          </Button>
        )}
        <button className="text-slate-400 hover:text-slate-600 ml-1" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Saved Allocation Row ───────────────────────────────────────────────────────
function AllocationRow({ row, resources, onUpdate, onRemove }) {
  const isNoLonger = row.rule_match_status === "no_longer_matches";

  return (
    <>
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

        {/* Work Item + status inline */}
        <td className="px-2 py-2 min-w-[160px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-800">{row.work_name_snapshot}</span>
            {isNoLonger && (
              <span className="text-[10px] border border-amber-300 text-amber-700 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
                Outdated
              </span>
            )}
          </div>
        </td>

        {/* Source */}
        <td className="px-2 py-2 w-20">
          <SourceBadge source={row.source} />
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
          <span className="font-mono text-slate-500">{minutesToDisplay(row.base_minutes)}</span>
        </td>

        {/* Extra Time */}
        <td className="px-2 py-2 w-28">
          <div className="flex gap-1 items-center">
            <Input
              type="number" min={0}
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
              type="number" min={0} max={59}
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
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
            onClick={() => onRemove(row._key)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      </tr>

      {/* Outdated note row — no colored background, just a subtle text note */}
      {isNoLonger && (
        <tr className="border-b border-slate-100">
          <td colSpan={9} className="px-3 pb-2 pt-0">
            <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
              <p className="text-[11px] text-slate-500">
                This saved work no longer matches the current Stage 1 data. It still affects totals until removed.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-5 text-[10px] px-2 shrink-0"
                onClick={() => onRemove(row._key)}
              >
                Remove
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Saved Allocation Group Block ───────────────────────────────────────────────
function AllocationGroupBlock({ group, resources, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true);
  const selectedCount = group.rows.filter(r => r.selected).length;
  const groupMinutes = group.rows.filter(r => r.selected).reduce((s, r) => s + (r.total_minutes || 0), 0);
  const outdatedCount = group.rows.filter(r => r.rule_match_status === "no_longer_matches").length;

  return (
    <div className="mb-2">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-t text-left"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
        <span className="text-xs font-semibold text-slate-700">{group.category}</span>
        <span className="text-[10px] text-slate-400 mx-1">→</span>
        <span className="text-xs text-slate-500">{group.triggerValue}</span>
        {outdatedCount > 0 && (
          <span className="text-[10px] text-amber-600 ml-1">· {outdatedCount} outdated</span>
        )}
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

// ── Rule Suggestions Section ───────────────────────────────────────────────────
function SuggestionRow({ suggestion, onAdd }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-700">{suggestion.workName}</span>
          <span className="text-[10px] border border-slate-300 text-slate-400 rounded px-1 py-0.5">Suggested</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">{suggestion.categoryName} → {suggestion.triggerValueSnapshot}</p>
        <p className="text-[11px] text-slate-400">{suggestion.resourceName || "—"} · {minutesToDisplay(suggestion.baseMinutes)}</p>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1" onClick={() => onAdd(suggestion)}>
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
  );
}

function RuleSuggestionsSection({ suggestions, onAdd, onApplyAll }) {
  const [open, setOpen] = useState(true);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <button
          className="flex items-center gap-1.5 text-left"
          onClick={() => setOpen(o => !o)}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-700">
            Rule Suggestions
            <span className="ml-1.5 text-[11px] font-normal text-slate-400 border border-slate-300 rounded-full px-1.5 py-0.5">{suggestions.length}</span>
          </span>
        </button>
        {open && (
          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 ml-auto" onClick={onApplyAll}>
            <Plus className="h-3 w-3 mr-1" /> Add All
          </Button>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mb-2 ml-5">
        Generated from the revised Stage 1 data. Not saved yet — they do not affect totals or planning status.
      </p>
      {open && (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <SuggestionRow key={i} suggestion={s} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row grouping helper ────────────────────────────────────────────────────────
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

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function Stage2RightPanel({
  rows, resources, workItems, rules = [], categories = [], triggerValues = [],
  resourceBreakdown, totalMinutes, planningStatus,
  ruleDiff, bannerDismissed, hasDiff,
  onUpdateRow, onRemoveRow, onAddTemplate, onAddManual,
  onAddNewSuggestion, onApplyAllNewSuggestions, onDismissBanner,
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const groups = groupRows(rows);
  const selectedRows = rows.filter(r => r.selected);
  const allNewSuggestions = ruleDiff?.newSuggestions || [];

  return (
    <div className="flex flex-col h-full">
      {/* Rule Change Banner */}
      {hasDiff && !bannerDismissed && (
        <RuleChangeBanner
          ruleDiff={ruleDiff}
          onReview={() => setShowReview(true)}
          onApplyAll={onApplyAllNewSuggestions}
          onDismiss={onDismissBanner}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div>
          <p className="text-sm font-bold text-slate-800">Work Allocation</p>
          <p className="text-xs text-slate-400">{selectedRows.length} works selected · {minutesToDisplay(totalMinutes)} total</p>
        </div>
        <div className="flex gap-2 items-center">
          {hasDiff && bannerDismissed && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-slate-600" onClick={() => setShowReview(true)}>
              <Info className="h-3.5 w-3.5" /> Rule Changes
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowTemplate(true)}>
            <Plus className="h-3.5 w-3.5" /> Add from Template
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowManual(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Manual Work
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── Saved Allocation ──────────────────────────────────────────────── */}
        <div className="mb-1">
          <div className="mb-2">
            <p className="text-sm font-semibold text-slate-700">Saved Allocation</p>
            <p className="text-[11px] text-slate-400">These works are saved for planning. They affect totals and resource breakdown.</p>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-400">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No works in saved allocation.</p>
              <p className="text-xs mt-1">Add from template, manually, or apply rule suggestions.</p>
            </div>
          ) : (
            groups.map((g, i) => (
              <AllocationGroupBlock
                key={i}
                group={g}
                resources={resources}
                onUpdate={onUpdateRow}
                onRemove={onRemoveRow}
              />
            ))
          )}
        </div>

        {/* ── Rule Suggestions ─────────────────────────────────────────────── */}
        {hasDiff && allNewSuggestions.length > 0 && (
          <RuleSuggestionsSection
            suggestions={allNewSuggestions}
            onAdd={onAddNewSuggestion}
            onApplyAll={onApplyAllNewSuggestions}
          />
        )}
      </div>

      {/* Resource Breakdown + Planning Status note */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Resource Breakdown</p>
          <p className="text-[10px] text-slate-400">Calculated from selected saved allocation only</p>
        </div>
        {resourceBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400">No selected works.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resourceBreakdown.map((rb, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2.5 py-1.5">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">{rb.name}</span>
                <span className="text-[10px] text-slate-400">· {rb.count} work{rb.count !== 1 ? "s" : ""}</span>
                <span className="text-xs font-mono text-slate-800">{rb.display}</span>
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
      {showReview && ruleDiff && (
        <ReviewChangesModal
          ruleDiff={ruleDiff}
          onAddSuggestion={onAddNewSuggestion}
          onRemoveRow={onRemoveRow}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}