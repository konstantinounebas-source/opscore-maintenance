import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Lock, ClipboardList, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import OrderLocationModule from "@/components/stationlogs/stage1/OrderLocationModule.jsx";
import Stage2Workspace from "@/components/stationlogs/stage2/Stage2Workspace.jsx";
import Stage3PlanningWorkspace from "@/components/stationlogs/stage3/Stage3PlanningWorkspace.jsx";
import Stage3DeadlinesSummary from "@/components/stationlogs/Stage3DeadlinesSummary.jsx";
import { minutesToDisplay } from "@/components/stationlogs/settings/workrules/workRulesUtils";

const STAGE_FIELDS = {
  1: { title: "Order + Location", fields: ["Asset Code", "Location Address", "Municipality", "Latitude", "Longitude"] },
  2: { title: "Work Categorization & Time Estimation", fields: ["Category", "Estimated Duration", "Resource Needs"] },
  3: { title: "Master Planning", fields: ["Timeline", "Resources", "Schedule", "Risks"] },
  4: { title: "Inspection Planning", fields: ["Inspector", "Schedule", "Inspection Type", "Scope"] },
  5: { title: "Inspection Execution", fields: ["Inspection Date", "Findings", "Issues Identified", "Photos/Evidence"] },
  6: { title: "Inspection Approval Gate", fields: ["Approval Status", "Comments", "Decision", "Approved By"] },
  7: { title: "Work Instruction", fields: ["Instructions", "Safety Procedures", "Quality Standards", "Specifications"] },
  8: { title: "Draft Weekly Schedule", fields: ["Week", "Team Assignment", "Start Date", "Duration"] },
  9: { title: "RCA", fields: ["Root Cause Analysis", "Corrective Actions", "Findings", "Impact Assessment"] },
  10: { title: "RCA Approval Gate", fields: ["PWD Approval", "Municipality Approval", "Police Approval", "Status"] },
  11: { title: "Schedule Verification", fields: ["Verified Date", "Verified By", "Discrepancies", "Confirmation"] },
  12: { title: "Work Execution", fields: ["Progress", "Completion Status", "Quality Checks", "Evidence"] },
  13: { title: "Filing / Station Log", fields: ["Documentation", "Archive Date", "Certified By", "Location"] },
  14: { title: "QA Check", fields: ["QA Results", "Issues Found", "Approval Status", "Sign-off"] },
  15: { title: "Delivery / Acceptance", fields: ["Delivery Date", "Acceptance", "Handed to", "Sign-off"] },
  16: { title: "Snagging / Rework", fields: ["Snagging Items", "Rework Schedule", "Severity Levels", "Status"] },
  17: { title: "Final Acceptance", fields: ["Final Check", "Sign-off", "Completion Date", "Notes"] },
  18: { title: "Invoicing", fields: ["Invoice Status", "Amount", "Payment Terms", "Date"] },
};

export default function StationLogAccordion({
  log,
  tasks,
  approvals,
  instructions,
  stages,
  expandedStage,
  setExpandedStage,
  asset,
  currentData,
  attachments,
}) {
  const [stage2Open, setStage2Open] = useState(false);
  const [stage3Open, setStage3Open] = useState(false);
  const queryClient = useQueryClient();

  // Handle stage toggle with auto-collapse of other completed stages
  const handleStageToggle = (stageId) => {
    if (expandedStage === stageId) {
      // Closing current stage
      setExpandedStage(null);
    } else {
      // Opening new stage - collapse other completed stages
      const stageNum = Number(stageId);
      setExpandedStage(stageId);
    }
  };
  const getStageTasks = (stageId) => tasks.filter(t => t.stage === stageId);
  const getStageApprovals = (stageId) => approvals.filter(a => a.stage === stageId);
  const getStageInstructions = (stageId) => instructions.filter(i => i.related_stage === stageId);

  // Fetch Stage 3 planning items for summary
  const { data: stage3Items = [] } = useQuery({
    queryKey: ["stage3PlanningItemsForAccordion", log.id],
    queryFn: () => base44.entities.StationLogStage3PlanningItems.filter({ station_log_id: log.id }),
  });

  return (
    <>
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-gray-50">
        <CardTitle className="text-base">18-Stage Workflow</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion value={expandedStage || ""} onValueChange={handleStageToggle} className="w-full">
          {stages.map(stage => {
            const isCompleted = stage.id < log.current_stage;
            const isCurrent = stage.id === log.current_stage;
            const stageTasks = getStageTasks(stage.id);
            const stageApprovals = getStageApprovals(stage.id);
            const stageInstructions = getStageInstructions(stage.id);
            const stageFields = STAGE_FIELDS[stage.id] || {};

            const hasBlockingApproval = stageApprovals.some(
              a => a.is_blocking && (a.status === "Pending" || a.status === "Rejected")
            );
            const hasBlockingTasks = stageTasks.some(t => t.is_blocking && t.status !== "Completed");

            let headerBg = isCompleted ? "bg-green-50 hover:bg-green-100" : isCurrent ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50";
            let borderColor = isCompleted ? "border-l-green-500" : isCurrent ? "border-l-blue-500" : "border-l-gray-300";

            return (
              <AccordionItem key={stage.id} value={String(stage.id)} className={`border-l-4 ${borderColor}`}>
                <AccordionTrigger className={`${headerBg} px-4 py-3 hover:no-underline`}>
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{
                      backgroundColor: isCompleted ? "#10b981" : isCurrent ? "#3b82f6" : "#9ca3af"
                    }}>
                      {stage.id}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{stage.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{stageFields.title}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {isCompleted && <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>}
                      {isCurrent && <Badge className="bg-blue-100 text-blue-800 text-xs">Current</Badge>}
                      {!isCompleted && !isCurrent && <Badge variant="outline" className="text-xs">Pending</Badge>}
                      {hasBlockingApproval && <Badge className="bg-red-100 text-red-800 text-xs gap-1"><AlertCircle className="h-3 w-3" />Approval Gate</Badge>}
                      {stageTasks.length > 0 && <Badge variant="secondary" className="text-xs">{stageTasks.length} task{stageTasks.length > 1 ? 's' : ''}</Badge>}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="border-t border-gray-200 p-4 space-y-4">
                  {/* Stage 1: Order + Location Module */}
                  {stage.id === 1 && (
                    <OrderLocationModule log={log} asset={asset} />
                  )}

                  {/* Stage 2: Work Categorization & Time Estimation */}
                  {stage.id === 2 && (
                    <div className="space-y-3">
                      {/* Summary row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Planning Status</p>
                          <p className={`text-sm font-bold mt-1 ${log.stage_2_planning_status === "Ready for Planning" ? "text-green-600" : "text-amber-600"}`}>
                            {log.stage_2_planning_status || "Incomplete"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Time</p>
                          <p className="text-sm font-bold text-slate-800 mt-1 font-mono">
                            {log.stage_2_total_minutes ? minutesToDisplay(log.stage_2_total_minutes) : "—"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Stage 2</p>
                          <p className={`text-sm font-bold mt-1 ${log.stage_2_completed ? "text-green-600" : "text-slate-400"}`}>
                            {log.stage_2_completed ? "Completed" : "Not started"}
                          </p>
                        </div>
                      </div>

                      {/* Resource breakdown */}
                      {log.stage_2_resource_breakdown_json && (() => {
                        try {
                          const rb = JSON.parse(log.stage_2_resource_breakdown_json);
                          if (rb.length > 0) return (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Resource Breakdown</p>
                              <div className="flex flex-wrap gap-2">
                                {rb.map((r, i) => (
                                  <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-700">{r.name}</span>
                                    <span className="text-[10px] text-slate-400">— {r.count} works</span>
                                    <span className="text-xs font-mono text-slate-800">{r.display}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch {}
                        return null;
                      })()}

                      <Button
                        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setStage2Open(true)}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Open Stage 2 Workspace
                      </Button>
                    </div>
                  )}

                  {/* Stage 3: Master Planning */}
                  {stage.id === 3 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Planning Status</p>
                          <p className={`text-sm font-bold mt-1 ${log.stage_3_planning_status === "Ready" || log.stage_3_planning_status === "Completed" ? "text-green-600" : log.stage_3_planning_status === "At Risk" ? "text-red-600" : "text-amber-600"}`}>
                            {log.stage_3_planning_status || "Not Planned"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Execution Period</p>
                          <p className="text-sm font-bold text-slate-800 mt-1 font-mono">
                            {log.stage_3_execution_date || "—"} to {log.stage_3_execution_finish || "—"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Stage 3</p>
                          <p className={`text-sm font-bold mt-1 ${log.stage_3_completed ? "text-green-600" : "text-slate-400"}`}>
                            {log.stage_3_completed ? "Completed" : "Not started"}
                          </p>
                        </div>
                      </div>

                      {/* Planning Deadlines Summary */}
                      <div className="border-t pt-3">
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2">📅 Planning Dates / Deadlines</p>
                        <Stage3DeadlinesSummary savedItems={stage3Items} />
                      </div>

                      {log.stage_2_completed ? (
                        <Button
                          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setStage3Open(true)}
                        >
                          <ClipboardList className="h-4 w-4" />
                          Open Stage 3 Planning Workspace
                        </Button>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800">Complete Stage 2 before opening Stage 3 Planning Workspace.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other stages: placeholder fields */}
                  {stage.id !== 1 && stage.id !== 2 && stage.id !== 3 && stageFields.fields?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase mb-3">Stage Fields</p>
                    <div className="grid grid-cols-2 gap-3">
                      {stageFields.fields?.map(field => (
                        <div key={field} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                          <p className="text-xs font-semibold text-gray-600 uppercase">{field}</p>
                          <p className="text-sm text-gray-400 mt-1">Not filled</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Approval Gates */}
                  {stageApprovals.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold text-gray-700 uppercase mb-3">🔒 Approval Gates</p>
                      <div className="space-y-2">
                        {stageApprovals.map(approval => (
                          <div key={approval.id} className={`p-3 rounded-lg border-l-4 ${
                            approval.status === "Approved" ? "bg-green-50 border-l-green-500" :
                            approval.status === "Rejected" ? "bg-red-50 border-l-red-500" :
                            "bg-yellow-50 border-l-yellow-500"
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm text-gray-900">{approval.approval_type}</p>
                                <Badge className={`mt-1 text-xs ${
                                  approval.status === "Approved" ? "bg-green-100 text-green-800" :
                                  approval.status === "Rejected" ? "bg-red-100 text-red-800" :
                                  "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {approval.status}
                                </Badge>
                              </div>
                              {approval.status === "Approved" && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />}
                              {approval.status === "Rejected" && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />}
                            </div>
                            {approval.comments && <p className="text-xs text-gray-600 mt-2">💬 {approval.comments}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {stageTasks.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold text-gray-700 uppercase mb-3">Related Tasks</p>
                      <div className="space-y-2">
                        {stageTasks.map(task => (
                          <div key={task.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-gray-900">{task.description}</p>
                                <p className="text-xs text-gray-600 mt-1">👤 {task.responsible || "Unassigned"}</p>
                              </div>
                              <div className="flex-shrink-0">
                                {task.is_blocking && <Badge className="bg-red-100 text-red-800 text-xs gap-1"><Lock className="h-3 w-3" />Blocking</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{task.status}</Badge>
                              <Badge variant="outline" className="text-xs">📅 {task.due_date || "No date"}</Badge>
                              <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Authority Instructions */}
                  {stageInstructions.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold text-gray-700 uppercase mb-3">⚡ Authority Instructions</p>
                      <div className="space-y-2">
                        {stageInstructions.map(instr => (
                          <div key={instr.id} className={`p-3 rounded-lg border-l-4 ${
                            instr.status === "Implemented" ? "bg-green-50 border-l-green-500" :
                            instr.status === "Acknowledged" ? "bg-blue-50 border-l-blue-500" :
                            "bg-gray-50 border-l-gray-400"
                          }`}>
                            <p className="font-semibold text-sm text-gray-900">{instr.description}</p>
                            <p className="text-xs text-gray-600 mt-1">Sent: {instr.sent_date || "—"}</p>
                            <Badge className="mt-2 text-xs">{instr.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {!isCompleted && !isCurrent && (
                    <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200 flex gap-2">
                      <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>This stage is not yet active. Complete earlier stages to unlock it.</span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>

    {/* Stage 2 full-screen workspace */}
    {stage2Open && (
      <Stage2Workspace
        log={log}
        currentData={currentData}
        attachments={attachments}
        onClose={() => setStage2Open(false)}
        onCompleted={() => {
          setStage2Open(false);
        }}
        onGoToStage1={() => {
          setStage2Open(false);
          setExpandedStage("1");
        }}
      />
    )}

    {stage3Open && (
      <Stage3PlanningWorkspace
        log={log}
        currentData={currentData}
        asset={asset}
        onClose={() => {
          setStage3Open(false);
          queryClient.invalidateQueries({ queryKey: ["stage3PlanningItemsForAccordion", log.id] });
        }}
        onCompleted={() => {
          setStage3Open(false);
          queryClient.invalidateQueries({ queryKey: ["stage3PlanningItemsForAccordion", log.id] });
        }}
      />
    )}
  </>
  );
}