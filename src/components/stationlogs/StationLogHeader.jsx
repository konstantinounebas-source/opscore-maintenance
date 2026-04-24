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

export default function StationLogHeader({ log, asset }) {
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
              <p className="text-sm font-medium text-gray-900 mt-1">{log.next_action || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">NEXT DEADLINE</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{log.next_deadline || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">PLANNING STATUS</p>
              <p className="text-sm font-medium text-blue-700 mt-1">{log.planning_status || "Not Scheduled"}</p>
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