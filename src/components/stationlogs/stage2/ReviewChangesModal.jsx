import React from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, CheckCircle } from "lucide-react";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";

export default function ReviewChangesModal({ ruleDiff, onAddSuggestion, onRemoveRow, onClose }) {
  const { newSuggestions = [], noLongerMatching = [], stillMatchingRuleIds } = ruleDiff || {};
  const stillCount = stillMatchingRuleIds?.size ?? 0;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <p className="font-semibold text-slate-800">Review Rule Changes</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Saved allocation is not changed automatically. Review new suggestions and outdated saved works below.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* A. New Suggestions */}
          <Section
            title="A. New Suggestions"
            count={newSuggestions.length}
            note="Not saved yet. Add to include them in the allocation."
            emptyText="No new suggestions from the updated rules."
          >
            {newSuggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.workName}</p>
                  <p className="text-[11px] text-slate-400">{s.categoryName} → {s.triggerValueSnapshot}</p>
                  <p className="text-[11px] text-slate-400">{s.resourceName || "—"} · {minutesToDisplay(s.baseMinutes)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 shrink-0"
                  onClick={() => onAddSuggestion(s)}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
            ))}
          </Section>

          {/* B. Outdated Saved Works */}
          <Section
            title="B. Outdated Saved Works"
            count={noLongerMatching.length}
            note="These are already saved in your allocation but no longer match the current Stage 1 data. They still affect totals until removed."
            emptyText="All saved auto works still match the current Stage 1 data."
          >
            {noLongerMatching.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{row.work_name_snapshot}</p>
                    <span className="text-[10px] border border-amber-300 text-amber-600 rounded px-1.5 py-0.5 shrink-0">Outdated</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{row.category_name_snapshot} → {row.trigger_value_snapshot}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No longer matches current Stage 1 data</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClose}>
                    Keep
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { onRemoveRow(row._key); }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </Section>

          {/* C. Still Matching */}
          <Section
            title="C. Still Matching Saved Works"
            count={stillCount}
            note="These saved auto works still match the current rules. No action needed."
            emptyText="No matching saved auto works."
          >
            {stillCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
                <CheckCircle className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-600">
                  {stillCount} auto work{stillCount !== 1 ? "s are" : " is"} up to date with the current Stage 1 data.
                </p>
              </div>
            )}
          </Section>

        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 shrink-0">
          <p className="text-[11px] text-slate-400">Changes to saved allocation take effect when you save or complete Stage 2.</p>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, note, emptyText, children }) {
  return (
    <div>
      <div className="mb-1.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <span className="text-[10px] border border-slate-300 text-slate-500 rounded-full px-1.5 py-0.5">{count}</span>
        </div>
        {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="space-y-1.5">
        {count === 0
          ? <p className="text-xs text-slate-400 italic px-1">{emptyText}</p>
          : children
        }
      </div>
    </div>
  );
}