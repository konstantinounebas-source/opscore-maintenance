import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import StationLogDetail from "@/components/stationlogs/StationLogDetail";

const WORKFLOW_STAGES = [
  { id: 1, name: "Order + Location" },
  { id: 2, name: "Work Categorization & Time Estimation" },
  { id: 3, name: "Master Planning" },
  { id: 4, name: "Inspection Planning" },
  { id: 5, name: "Inspection Execution" },
  { id: 6, name: "Inspection Approval Gate" },
  { id: 7, name: "Work Instruction" },
  { id: 8, name: "Draft Weekly Schedule" },
  { id: 9, name: "RCA" },
  { id: 10, name: "RCA Approval Gate" },
  { id: 11, name: "Schedule Verification" },
  { id: 12, name: "Work Execution" },
  { id: 13, name: "Filing / Station Log" },
  { id: 14, name: "QA Check" },
  { id: 15, name: "Delivery / Acceptance" },
  { id: 16, name: "Snagging / Rework" },
  { id: 17, name: "Final Acceptance" },
  { id: 18, name: "Invoicing" },
];

export default function BusStopLogs() {
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["stationLogs"],
    queryFn: () => base44.entities.StationLog.list(),
  });

  const filteredLogs = logs.filter(log => {
    const asset = assets.find(a => a.id === log.asset_id);
    const searchStr = search.toLowerCase();
    return (
      log.asset_id?.toLowerCase().includes(searchStr) ||
      asset?.asset_id?.toLowerCase().includes(searchStr) ||
      asset?.location_address?.toLowerCase().includes(searchStr)
    );
  });

  const getStatusColor = (status) => {
    const colors = {
      "Waiting": "bg-yellow-100 text-yellow-800",
      "In Progress": "bg-blue-100 text-blue-800",
      "Blocked": "bg-red-100 text-red-800",
      "Completed": "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (selectedLog) {
    return (
      <StationLogDetail
        log={selectedLog}
        onBack={() => setSelectedLog(null)}
        stages={WORKFLOW_STAGES}
        assets={assets}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Bus Stop Station Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Workflow management for bus stop installations ({logs.length} total)</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Log</Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by Bus Stop ID, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              {logs.length === 0 ? "No station logs yet. Create one to start." : "No logs match your search."}
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map(log => {
            const asset = assets.find(a => a.id === log.asset_id);
            const stage = WORKFLOW_STAGES.find(s => s.id === log.current_stage);
            
            return (
              <Card key={log.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedLog(log)}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-5 gap-4 items-start">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Bus Stop ID</p>
                      <p className="font-bold text-base">{asset?.asset_id || log.asset_id}</p>
                      <p className="text-xs text-gray-500 mt-1">{asset?.location_address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Current Stage</p>
                      <p className="font-semibold text-sm">{stage?.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{log.current_stage} / 18</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
                      <Badge className={`${getStatusColor(log.current_status)} mt-1`}>
                        {log.current_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Progression</p>
                      <p className={`text-sm font-bold ${log.can_move_forward ? "text-green-600" : "text-red-600"}`}>
                        {log.can_move_forward ? "✓ Can Proceed" : "✗ Blocked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Next Deadline</p>
                      <p className="font-semibold text-sm">{log.next_deadline || "—"}</p>
                      {log.planning_status && <p className="text-xs text-blue-600 mt-1">📅 {log.planning_status}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}