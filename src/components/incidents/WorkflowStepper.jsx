import React from "react";
import { CheckCircle2, Circle, Lock, AlertCircle, XCircle } from "lucide-react";

export default function WorkflowStepper({ incident, hasFMPISubmitted, fmpiApprovalRequired, incidentWorkOrders }) {
  const workflowState = incident.workflow_state || "Awaiting_CR_OMPI";

  // Define all steps in the workflow
  const steps = [
    {
      id: "cr_ompi",
      label: "CR + OMPI",
      description: "Confirmation of Receipt & Outline Management Plan",
      completed: workflowState !== "Awaiting_CR_OMPI",
      timestamp: incident.cr_ompi_submitted_at,
      optional: false,
    },
    {
      id: "fmpi",
      label: "Full Management Plan (FMPI)",
      description: hasFMPISubmitted ? "Submitted" : "Pending submission",
      completed: hasFMPISubmitted,
      timestamp: incident.fmpi_submitted_at,
      optional: false,
      locked: false,
    },
    {
      id: "ca_approval",
      label: "CA Approval",
      description: fmpiApprovalRequired ? "OWR — Approval required" : "In Warranty — Not required",
      completed: !fmpiApprovalRequired || incident.ca_decision === "Approved",
      timestamp: incident.ca_decision_at,
      optional: !fmpiApprovalRequired,
      locked: false,
      rejected: incident.ca_decision === "Rejected",
    },
    {
      id: "work_orders",
      label: "Work Orders",
      description: "Make Safe, Inspection, Corrective",
      completed: incidentWorkOrders.length > 0 && incidentWorkOrders.every(w => w.status === "Completed" || w.status === "Cancelled"),
      optional: false,
      locked: false,
    },
    {
      id: "closure",
      label: "Closure",
      description: "Final photos & closure notes",
      completed: workflowState === "Closed",
      timestamp: incident.closed_at,
      optional: false,
      locked: false,
    },
  ];

  const getStepIcon = (step) => {
    if (step.locked) {
      return <Lock className="h-4 w-4 text-slate-400" />;
    }
    if (step.rejected) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (step.completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <Circle className="h-4 h-4 text-slate-300" />;
  };

  const getStepColor = (step, index) => {
    if (step.locked) {
      return "opacity-50";
    }
    if (step.rejected) {
      return "border-red-200 bg-red-50";
    }
    if (step.completed) {
      return "border-green-200 bg-green-50";
    }
    return "border-slate-200 bg-white";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Workflow Timeline</p>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex gap-4">
            {/* Timeline line + icon */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-8 w-8 rounded-full border border-slate-300 bg-white shrink-0">
                {getStepIcon(step)}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-0.5 h-8 my-1 ${step.completed ? "bg-green-300" : "bg-slate-200"}`} />
              )}
            </div>

            {/* Step content */}
            <div className={`flex-1 rounded-lg border p-3 ${getStepColor(step, index)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${step.completed ? "text-slate-600" : step.locked ? "text-slate-400" : "text-slate-800"}`}>
                    {step.label}
                    {step.optional && (
                      <span className="ml-2 text-[10px] font-normal text-slate-400 italic">(optional)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  {step.timestamp && (
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(step.timestamp).toLocaleDateString()} · {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {step.rejected && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Requires revision
                    </p>
                  )}
                </div>
                <div className="ml-2 shrink-0">
                  {step.completed ? (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">✓ Done</span>
                  ) : step.locked ? (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">Locked</span>
                  ) : step.rejected ? (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">Rejected</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded">Pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}