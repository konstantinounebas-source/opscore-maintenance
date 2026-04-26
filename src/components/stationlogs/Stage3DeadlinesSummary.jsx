import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Calendar, Clock } from "lucide-react";

function getStatusBadgeColor(status) {
  switch (status) {
    case "Overdue":
      return "bg-red-100 text-red-800";
    case "Due Today":
      return "bg-orange-100 text-orange-800";
    case "Due Soon":
      return "bg-amber-100 text-amber-800";
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Blocked":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export default function Stage3DeadlinesSummary({ savedItems = [] }) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (!savedItems || savedItems.length === 0) {
    return (
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex gap-2">
        <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          No planning deadlines saved yet. Open Stage 3 Planning Workspace to generate and save planning dates.
        </p>
      </div>
    );
  }

  // Filter active items
  const activeItems = savedItems.filter(i => i.is_active !== false);

  // Calculate summary counts
  const overdue = activeItems.filter(i => i.status === "Overdue").length;
  const dueSoon = activeItems.filter(i => i.status === "Due Soon").length;
  const completed = activeItems.filter(i => i.status === "Completed").length;

  // Sort by date, hide completed unless toggled (keep overdue always visible)
  const displayItems = activeItems
    .filter(i => showCompleted || (i.status !== "Completed"))
    .sort((a, b) => {
      const dateA = new Date(a.planned_date || "9999-12-31");
      const dateB = new Date(b.planned_date || "9999-12-31");
      return dateA - dateB;
    });

  // Group items by flow stage
  const itemsByStage = {};
  displayItems.forEach(item => {
    const stage = item.output_flow_stage_id;
    if (!itemsByStage[stage]) itemsByStage[stage] = [];
    itemsByStage[stage].push(item);
  });

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{savedItems.length}</p>
        </div>
        <div className={`p-3 rounded border ${overdue > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: overdue > 0 ? "#991b1b" : "#64748b" }}>
            Overdue
          </p>
          <p className="text-lg font-bold" style={{ color: overdue > 0 ? "#dc2626" : "#64748b" }}>
            {overdue}
          </p>
        </div>
        <div className={`p-3 rounded border ${dueSoon > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100"}`}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: dueSoon > 0 ? "#92400e" : "#64748b" }}>
            Due Soon
          </p>
          <p className="text-lg font-bold" style={{ color: dueSoon > 0 ? "#f59e0b" : "#64748b" }}>
            {dueSoon}
          </p>
        </div>
        <div className={`p-3 rounded border ${completed > 0 ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"}`}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: completed > 0 ? "#166534" : "#64748b" }}>
            Done
          </p>
          <p className="text-lg font-bold" style={{ color: completed > 0 ? "#16a34a" : "#64748b" }}>
            {completed}
          </p>
        </div>
      </div>

      {/* Planning Items List - Table Style */}
      <div className="space-y-1">
        {displayItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No active planning items to display.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            {displayItems.map((item, idx) => {
              const planStart = item.planned_start_date || (item.planned_date && `${item.planned_date} (start)`) || "No planning start";
              const planEnd = item.planned_end_date || (item.planned_date && `${item.planned_date} (end)`) || "No planning end";
              const deadline = item.planned_date || "No deadline";
              const completion = item.actual_date ? `${item.actual_date}` : "Not completed";

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2.5 px-4 py-3 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                  } ${idx !== displayItems.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2 flex-1 min-w-0">
                      <span className="font-bold text-slate-800 text-sm">Stage {item.output_flow_stage_id}</span>
                      <span className="text-slate-700 truncate font-medium text-sm">
                        {item.planning_item_name_snapshot || item.planning_item_name}
                      </span>
                    </div>
                    <Badge className={`text-[10px] flex-shrink-0 whitespace-nowrap ${getStatusBadgeColor(item.status)}`}>
                      {item.status}
                    </Badge>
                  </div>

                  {/* Date rows */}
                  <div className="grid grid-cols-2 gap-3 ml-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-semibold uppercase">Start</span>
                      <span className="text-sm text-slate-700 font-mono">{planStart}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-semibold uppercase">End</span>
                      <span className="text-sm text-slate-700 font-mono">{planEnd}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-semibold uppercase">Deadline</span>
                      <span className="text-sm text-slate-700 font-mono">{deadline}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-semibold uppercase">Completed</span>
                      <span className="text-sm text-slate-700 font-mono">{completion}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toggle completed */}
      {completed > 0 && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-1"
        >
          {showCompleted ? "Hide" : "Show"} completed ({completed})
        </button>
      )}
    </div>
  );
}