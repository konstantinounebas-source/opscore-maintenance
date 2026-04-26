import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, CheckCircle } from "lucide-react";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";

export default function ReviewChangesModal({ ruleDiff, onAddSuggestion, onRemoveRow, onClose }) {
  const { newSuggestions = [], noLongerMatching = [], stillMatchingRuleIds } = ruleDiff || {};

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <p className="font-bold text-slate-800">Review Rule Changes</p>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* 1. New Suggestions */}
          <Section
            title="New Suggested Works"
            count={newSuggestions.length}
            badgeColor="bg-yellow-100 text-yellow-800"
            empty="No new suggestions."
          >
            {newSuggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.workName}</p>
                  <p className="text-[11px] text-slate-500">{s.categoryName} → {s.triggerValueSnapshot}</p>
                  <p className="text-[11px] text-slate-500">{s.resourceName} · {minutesToDisplay(s.baseMinutes)}</p>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-yellow-600 hover:bg-yellow-700 text-white shrink-0"
                  onClick={() => onAddSuggestion(s)}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
            ))}
          </Section>

          {/* 2. No Longer Matching */}
          <Section
            title="No Longer Matching"
            count={noLongerMatching.length}
            badgeColor="bg-red-100 text-red-800"
            empty="All saved auto works still match current Stage 1 data."
          >
            {noLongerMatching.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{row.work_name_snapshot}</p>
                  <p className="text-[11px] text-slate-500">{row.category_name_snapshot} → {row.trigger_value_snapshot}</p>
                  <p className="text-[11px] text-red-600 font-medium mt-0.5">No longer matches current Stage 1 data</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {/* "Keep" = do nothing, just close the review. Remove from modal list by removing the actual row. */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => onRemoveRow(row._key)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </Section>

          {/* 3. Still Matching */}
          <Section
            title="Still Matching"
            badgeColor="bg-green-100 text-green-800"
            count={stillMatchingRuleIds?.size ?? 0}
            empty="No matching works."
          >
            <p className="text-xs text-slate-500 italic">These works are in your allocation and still match the current Stage 1 data. No action needed.</p>
            {stillMatchingRuleIds && stillMatchingRuleIds.size > 0 && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-800">{stillMatchingRuleIds.size} auto work{stillMatchingRuleIds.size !== 1 ? "s" : ""} are up to date.</p>
              </div>
            )}
          </Section>

        </div>

        <div className="flex justify-end px-5 py-3 border-t border-slate-200 shrink-0">
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, badgeColor, empty, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</p>
        <Badge className={`text-[10px] ${badgeColor}`}>{count}</Badge>
      </div>
      <div className="space-y-1.5">
        {count === 0 ? (
          <p className="text-xs text-slate-400 italic">{empty}</p>
        ) : children}
      </div>
    </div>
  );
}