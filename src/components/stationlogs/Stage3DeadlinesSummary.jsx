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

  // Sort by date, hide completed/overdue unless toggled
  const displayItems = activeItems
    .filter(i => showCompleted || (i.status !== "Completed" && i.status !== "Overdue"))
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
        <div className="p-2 bg-slate-50 rounded border border-slate-100">
          <p className="text-[9px] font-semibold text-slate-400 uppercase">Total</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{savedItems.length}</p>
        </div>
        <div className={`p-2 rounded border ${overdue > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
          <p className="text-[9px] font-semibold uppercase" style={{ color: overdue > 0 ? "#991b1b" : "#64748b" }}>
            Overdue
          </p>
          <p className="text-sm font-bold" style={{ color: overdue > 0 ? "#dc2626" : "#64748b" }}>
            {overdue}
          </p>
        </div>
        <div className={`p-2 rounded border ${dueSoon > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100"}`}>
          <p className="text-[9px] font-semibold uppercase" style={{ color: dueSoon > 0 ? "#92400e" : "#64748b" }}>
            Due Soon
          </p>
          <p className="text-sm font-bold" style={{ color: dueSoon > 0 ? "#f59e0b" : "#64748b" }}>
            {dueSoon}
          </p>
        </div>
        <div className={`p-2 rounded border ${completed > 0 ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"}`}>
          <p className="text-[9px] font-semibold uppercase" style={{ color: completed > 0 ? "#166534" : "#64748b" }}>
            Done
          </p>
          <p className="text-sm font-bold" style={{ color: completed > 0 ? "#16a34a" : "#64748b" }}>
            {completed}
          </p>
        </div>
      </div>

      {/* Planning Items List */}
      <div className="space-y-1.5">
        {displayItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No active planning items to display.</p>
        ) : (
          displayItems.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2 p-2.5 bg-slate-50 rounded border border-slate-100 text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="font-semibold text-slate-800 truncate">
                    {item.planning_item_name_snapshot || item.planning_item_name}
                  </p>
                  {item.status === "Completed" && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mb-1">Stage {item.output_flow_stage_id}</p>
                <div className="flex flex-wrap gap-1">
                  {item.planned_date && (
                    <Badge variant="outline" className="text-[9px] gap-1 py-0">
                      <Calendar className="h-2.5 w-2.5" />
                      {item.planned_date}
                    </Badge>
                  )}
                  {item.planning_item_type === "Deadline" && (
                    <Badge variant="outline" className="text-[9px] gap-1 py-0">
                      <Clock className="h-2.5 w-2.5" />
                      Deadline
                    </Badge>
                  )}
                  {item.planning_item_type === "Planned Date" && (
                    <Badge variant="outline" className="text-[9px] gap-1 py-0">
                      <Calendar className="h-2.5 w-2.5" />
                      Scheduled
                    </Badge>
                  )}
                </div>
              </div>
              <Badge className={`text-[9px] flex-shrink-0 whitespace-nowrap ${getStatusBadgeColor(item.status)}`}>
                {item.status}
              </Badge>
            </div>
          ))
        )}
      </div>

      {/* Toggle completed/overdue */}
      {completed + overdue > 0 && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-1"
        >
          {showCompleted ? "Hide" : "Show"} completed & expired ({completed + overdue})
        </button>
      )}
    </div>
  );
}