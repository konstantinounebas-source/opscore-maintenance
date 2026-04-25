import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Loader2 } from "lucide-react";
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
  const [showNewLogDialog, setShowNewLogDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const logIdFromUrl = urlParams.get("logId");
  const [selectedLogId, setSelectedLogId] = useState(logIdFromUrl || null);

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["stationLogs"],
    queryFn: () => base44.entities.StationLog.list(),
  });

  const createLogMutation = useMutation({
    mutationFn: async (assetId) => {
      const newLog = await base44.entities.StationLog.create({
        asset_id: assetId,
        current_stage: 1,
        current_status: "In Progress",
        can_move_forward: true,
        next_action: "Complete Order + Location",
        planning_status: "Not Scheduled",
        blocking_summary: [],
        pending_summary: [],
      });
      return newLog;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stationLogs"] });
      setShowNewLogDialog(false);
      setSelectedAsset(null);
    },
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

  const selectedLog = selectedLogId ? logs.find(l => l.id === selectedLogId) : null;

  if (selectedLog) {
    return (
      <StationLogDetail
        log={selectedLog}
        onBack={() => {
          setSelectedLogId(null);
          window.history.replaceState({}, "", "/BusStopLogs");
        }}
        stages={WORKFLOW_STAGES}
        assets={assets}
      />
    );
  }

  const assetsWithoutLogs = assets.filter(
    a => !logs.some(l => l.asset_id === a.id)
  );

  const handleCreateLog = async () => {
    if (!selectedAsset) return;
    createLogMutation.mutate(selectedAsset);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Bus Stop Station Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Workflow management for bus stop installations ({logs.length} total)</p>
        </div>
        <Button className="gap-2" onClick={() => setShowNewLogDialog(true)}>
          <Plus className="h-4 w-4" />New Log
        </Button>
      </div>

      <Dialog open={showNewLogDialog} onOpenChange={setShowNewLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Station Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Bus Stop</label>
              <Select value={selectedAsset || ""} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bus stop..." />
                </SelectTrigger>
                <SelectContent>
                  {assetsWithoutLogs.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">All assets have logs</div>
                  ) : (
                    assetsWithoutLogs.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_id} - {asset.location_address}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewLogDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateLog}
                disabled={!selectedAsset || createLogMutation.isPending}
              >
                {createLogMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <Card key={log.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedLogId(log.id)}>
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