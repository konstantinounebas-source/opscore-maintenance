import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STAGE_FIELDS = {
  1: ["Ordered Shelter Type", "Location Address", "Municipality"],
  2: ["Work Category", "Estimated Duration", "Resources Required"],
  3: ["Planning Timeline", "Resource Allocation", "Schedule"],
  4: ["Inspection Schedule", "Inspector Assigned", "Inspection Type"],
  5: ["Inspection Date", "Findings", "Issues Identified"],
  6: ["Approval Status", "Comments", "Decision"],
  7: ["Work Instructions", "Safety Procedures", "Quality Standards"],
  8: ["Weekly Schedule", "Team Assignment", "Start Date"],
  9: ["RCA Findings", "Root Cause", "Corrective Actions"],
  10: ["RCA Status", "Approver", "Decision"],
  11: ["Schedule Verification", "Verification Date", "Verified By"],
  12: ["Work Progress", "Completion Status", "Quality Checks"],
  13: ["Filing Status", "Documentation", "Archive Date"],
  14: ["QA Results", "Issues Found", "Approval Status"],
  15: ["Delivery Date", "Acceptance", "Sign-off"],
  16: ["Snagging Items", "Rework Schedule", "Severity Levels"],
  17: ["Final Check", "Sign-off", "Completion Date"],
  18: ["Invoice Status", "Amount", "Payment Terms"],
};

export default function StationLogAccordion({ log, tasks, stages }) {
  const [expandedStage, setExpandedStage] = useState(String(log.current_stage));

  const getCurrentStageTasks = (stageId) => {
    return tasks.filter(t => t.stage === stageId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Stages</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion value={expandedStage} onValueChange={setExpandedStage}>
          {stages.map(stage => {
            const isCompleted = stage.id < log.current_stage;
            const isCurrent = stage.id === log.current_stage;
            const stageTasks = getCurrentStageTasks(stage.id);

            return (
              <AccordionItem key={stage.id} value={String(stage.id)}>
                <AccordionTrigger className={`${isCurrent ? "bg-blue-50 hover:bg-blue-100" : isCompleted ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"}`}>
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}>
                      {isCurrent ? "Current" : isCompleted ? "Completed" : "Pending"}
                    </Badge>
                    <span className="font-medium">Stage {stage.id}: {stage.name}</span>
                    {stageTasks.length > 0 && (
                      <Badge variant="ghost">{stageTasks.length} tasks</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {STAGE_FIELDS[stage.id]?.map(field => (
                      <div key={field} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 font-semibold">{field}</p>
                        <p className="text-sm text-gray-600 mt-1">—</p>
                      </div>
                    ))}
                  </div>

                  {stageTasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-semibold mb-2">Related Tasks</p>
                      <div className="space-y-2">
                        {stageTasks.map(task => (
                          <div key={task.id} className="p-2 bg-blue-50 rounded border border-blue-200 text-xs">
                            <p className="font-medium">{task.description}</p>
                            <p className="text-gray-600">Assigned to: {task.responsible || "Unassigned"}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
                              {task.is_blocking && <Badge className="bg-red-100 text-red-800 text-[10px]">Blocking</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm">Add Task</Button>
                      <Button size="sm" variant="outline">Add Note</Button>
                      {log.can_move_forward && <Button size="sm" className="bg-green-600 hover:bg-green-700">Proceed to Next Stage</Button>}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}