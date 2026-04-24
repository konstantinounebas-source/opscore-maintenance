import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const getStatusColor = (status) => {
  const colors = {
    "Waiting": "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    "Blocked": "bg-red-100 text-red-800",
    "Completed": "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function StationLogHeader({ log, asset }) {
  if (!asset) return null;

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
      <CardContent className="pt-6">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-semibold">BUS STOP ID</p>
            <p className="text-lg font-bold">{asset.asset_id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">LOCATION</p>
            <p className="text-sm font-medium">{asset.location_address}</p>
            <p className="text-xs text-gray-500">{asset.municipality}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">CURRENT STAGE</p>
            <p className="text-sm font-medium">Stage {log.current_stage}/18</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">STATUS</p>
            <Badge className={`${getStatusColor(log.current_status)} mt-1`}>
              {log.current_status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">PROGRESSION</p>
            <p className={`text-sm font-bold ${log.can_move_forward ? "text-green-600" : "text-red-600"}`}>
              {log.can_move_forward ? "✓ Can Proceed" : "✗ Blocked"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs text-gray-500">Next Action</p>
            <p className="text-sm font-medium">{log.next_action || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Next Deadline</p>
            <p className="text-sm font-medium">{log.next_deadline || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Planning Status</p>
            <p className="text-sm font-medium">{log.planning_status || "Not Scheduled"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}