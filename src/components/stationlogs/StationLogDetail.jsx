import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StationLogHeader from "./StationLogHeader";
import WorkflowProgressBar from "./WorkflowProgressBar";
import StationLogAccordion from "./StationLogAccordion";
import StationLogRightPanel from "./StationLogRightPanel";

export default function StationLogDetail({ log, onBack, stages, assets }) {
  const [expandedStage, setExpandedStage] = useState(String(log.current_stage));

  const asset = assets?.find(a => a.id === log.asset_id);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", log.id],
    queryFn: () => base44.entities.StationLogTasks.filter({ station_log_id: log.id }),
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals", log.id],
    queryFn: () => base44.entities.StationLogApprovals.filter({ station_log_id: log.id }),
  });

  const { data: instructions = [] } = useQuery({
    queryKey: ["instructions", log.id],
    queryFn: () => base44.entities.StationLogAuthorityInstructions.filter({ station_log_id: log.id }),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", log.id],
    queryFn: () => base44.entities.StationLogActivityLog.filter({ station_log_id: log.id }),
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", log.id],
    queryFn: () => base44.entities.StationLogMilestones.filter({ station_log_id: log.id }),
  });

  // Compute blocking & pending items
  const blockingItems = [
    ...tasks.filter(t => t.is_blocking && t.status !== "Completed").map(t => ({ type: "Task", text: t.description, id: t.id })),
    ...approvals.filter(a => a.status === "Rejected" || (a.status === "Pending" && a.is_blocking)).map(a => ({ type: "Approval", text: a.approval_type, id: a.id, reason: a.comments })),
    ...instructions.filter(i => i.is_blocking && i.status !== "Implemented").map(i => ({ type: "Instruction", text: i.description, id: i.id })),
  ];

  const pendingItems = [
    ...tasks.filter(t => !t.is_blocking && t.status === "Open"),
    ...approvals.filter(a => a.status === "Pending"),
    ...instructions.filter(i => !i.is_blocking && i.status === "Pending"),
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />Back to Logs
      </Button>

      <StationLogHeader log={log} asset={asset} />

      <WorkflowProgressBar stages={stages} currentStage={log.current_stage} />

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 space-y-6">
          <StationLogAccordion 
            log={log} 
            tasks={tasks} 
            approvals={approvals}
            instructions={instructions}
            stages={stages}
            expandedStage={expandedStage}
            setExpandedStage={setExpandedStage}
          />
        </div>

        <div className="sticky top-6 h-fit">
          <StationLogRightPanel
            log={log}
            blockingItems={blockingItems}
            pendingItems={pendingItems}
            approvals={approvals}
            instructions={instructions}
            activities={activities}
            milestones={milestones}
          />
        </div>
      </div>
    </div>
  );
}