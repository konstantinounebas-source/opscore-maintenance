import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

const getStatusColor = (status) => {
  const colors = {
    "Waiting": "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    "Blocked": "bg-red-100 text-red-800",
    "Completed": "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const STAGE_NEXT_ACTIONS = {
  1: "Complete Order + Location",
  2: "Complete Work Categorization",
  3: "Complete Master Planning",
  4: "Schedule Inspection",
  5: "Execute Inspection",
  6: "Submit for Inspection Approval",
  7: "Issue Work Instruction",
  8: "Draft Weekly Schedule",
  9: "Complete RCA",
  10: "Submit RCA for Approval",
  11: "Verify Schedule",
  12: "Execute Work",
  13: "File Station Log",
  14: "Complete QA Check",
  15: "Deliver & Accept",
  16: "Complete Snagging / Rework",
  17: "Complete Final Acceptance",
  18: "Submit Invoice",
};

export default function StationLogHeader({ log, asset, currentData, stage3Items = [] }) {
  // Compute NEXT ACTION
  const nextAction = STAGE_NEXT_ACTIONS[log.current_stage] || "—";

  // Compute NEXT DEADLINE from stage3 planning items (earliest upcoming planned_date)
  const today = new Date().toISOString().split("T")[0];
  const upcomingDeadlines = stage3Items
    .filter(i => i.planned_date && i.planned_date >= today && i.status !== "Completed")
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date));
  const nextDeadlineItem = upcomingDeadlines[0];
  const nextDeadline = nextDeadlineItem
    ? `${nextDeadlineItem.planned_date} — ${nextDeadlineItem.planning_item_name_snapshot || ""}`
    : (currentData?.order_priority_date || currentData?.order_deadline_date || "—");

  // Compute PLANNING STATUS
  const planningStatus = log.stage_3_planning_status || log.planning_status || "Not Scheduled";
  const outOfSyncCount = stage3Items.filter(i => i.is_active !== false && i.sync_status === "Out of Sync").length;

  if (!asset) {
    return (
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardContent className="pt-6">
          <p className="text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const statusIcon = {
    "Waiting": <Clock className="h-4 w-4 inline mr-1" />,
    "In Progress": <Clock className="h-4 w-4 inline mr-1" />,
    "Blocked": <AlertCircle className="h-4 w-4 inline mr-1" />,
    "Completed": <CheckCircle className="h-4 w-4 inline mr-1" />,
  };

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="grid grid-cols-6 gap-4 mb-4">
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase">Bus Stop ID</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{asset.asset_id}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-bold text-indigo-600 uppercase">Location</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{asset.location_address}</p>
            <p className="text-xs text-gray-600">{asset.municipality} • Lat: {asset.latitude}, Lon: {asset.longitude}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase">Current Stage</p>
            <p className="text-lg font-bold text-gray-900 mt-1">Stage {log.current_stage}/18</p>
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase">Status</p>
            <Badge className={`${getStatusColor(log.current_status)} mt-1 gap-1`}>
              {statusIcon[log.current_status]}
              {log.current_status}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase">Progression</p>
            <p className={`text-base font-bold mt-1 ${log.can_move_forward ? "text-green-600" : "text-red-600"}`}>
              {log.can_move_forward ? "✓ CAN PROCEED" : "✗ BLOCKED"}
            </p>
          </div>
        </div>

        <div className="border-t border-indigo-200 pt-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold">NEXT ACTION</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{nextAction}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">NEXT DEADLINE</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{nextDeadline}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">PLANNING STATUS</p>
              {outOfSyncCount > 0 ? (
                <p className="text-sm font-medium mt-1 text-amber-700">⚠ Needs Update ({outOfSyncCount})</p>
              ) : (
                <p className={`text-sm font-medium mt-1 ${
                  planningStatus === "Ready" || planningStatus === "Completed" ? "text-green-700" :
                  planningStatus === "At Risk" ? "text-red-700" :
                  planningStatus === "Not Scheduled" ? "text-gray-500" :
                  "text-blue-700"
                }`}>{planningStatus}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">NOTES</p>
              <p className="text-sm text-gray-700 mt-1">{log.notes || "—"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}