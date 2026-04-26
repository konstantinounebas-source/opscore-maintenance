import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Stage3OutOfSyncWarning({ items, onUpdateItem }) {
  const [expanded, setExpanded] = useState(true);

  if (!items || items.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="font-semibold text-red-900 text-sm">
            {items.length} Planning Item{items.length > 1 ? "s" : ""} Out of Sync
          </span>
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 mt-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded p-2 space-y-1.5 border border-red-100">
              <div>
                <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                <p className="text-[10px] text-slate-500">Rule: {item.ruleName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] space-y-1">
                <div>
                  <p className="text-slate-500 font-semibold uppercase">Your Saved Date</p>
                  <p className="font-mono text-slate-800">{item.savedDate}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase">Recalculated Date</p>
                  <p className="font-mono text-slate-800">{item.newDate}</p>
                </div>
              </div>

              {item.oldBaseDateValue && (
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-1.5 rounded">
                  <div>
                    <p className="text-slate-500 font-semibold uppercase">Old Base Date</p>
                    <p className="text-slate-700">{item.oldBaseDateValue}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold uppercase">New Base Date</p>
                    <p className="text-slate-700">{item.newBaseDateValue}</p>
                  </div>
                </div>
              )}

              {item.oldRuleLogicText && (
                <div className="text-[10px] space-y-0.5">
                  <p className="text-slate-500 font-semibold uppercase">Old Logic</p>
                  <p className="text-slate-700">{item.oldRuleLogicText}</p>
                  <p className="text-slate-500 font-semibold uppercase mt-1">New Logic</p>
                  <p className="text-slate-700">{item.newRuleLogicText}</p>
                </div>
              )}

              <Button
                size="sm"
                className="w-full h-6 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={() => onUpdateItem(item.id, item.newDate)}
              >
                Update to {item.newDate}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}