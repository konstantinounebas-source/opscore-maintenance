import React from "react";
import { Clock, CheckCircle2, AlertTriangle, XCircle, Pause, Info, Wrench, Calendar } from "lucide-react";
import { formatDeadline, refreshSLAStatus, getNextActionLabel, deriveWorkflowStateFromLegacy, getPriorityLabel } from "@/lib/slaEngine";
import { differenceInHours } from "date-fns";

const SLA_STATUS_CONFIG = {
  "On Track":  { icon: Clock,         color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  "At Risk":   { icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     badge: "bg-amber-100 text-amber-700" },
  "Breached":  { icon: XCircle,       color: "text-red-600",     bg: "bg-red-50 border-red-200",         badge: "bg-red-100 text-red-700" },
  "Completed": { icon: CheckCircle2,  color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200",   badge: "bg-indigo-100 text-indigo-700" },
  "Paused":    { icon: Pause,         color: "text-slate-500",   bg: "bg-slate-50 border-slate-200",     badge: "bg-slate-100 text-slate-500" },
};

function hoursLeft(deadline) {
  if (!deadline) return null;
  const h = differenceInHours(new Date(deadline), new Date());
  return h;
}

export default function SLAStatusCard({ incident }) {
  if (!incident) return null;

  const workflowState = deriveWorkflowStateFromLegacy(incident);
  const slaStatus = incident.sla_deadline_at ? refreshSLAStatus(incident) : null;
  const config = SLA_STATUS_CONFIG[slaStatus] || SLA_STATUS_CONFIG["Paused"];
  const Icon = config.icon;
  const h = hoursLeft(incident.sla_deadline_at);
  const nextAction = getNextActionLabel(workflowState);

  // Derive warranty display
  const warrantyStatus = incident.warranty_status
    || (incident.is_owr === true ? "OWR" : incident.is_owr === false ? "In Warranty" : null)
    || (incident.out_of_warranty === "Yes" ? "OWR" : incident.out_of_warranty === "No" ? "In Warranty" : null);

  return (
    <div className={`rounded-xl border ${config.bg} p-5 space-y-4`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.badge}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active SLA</p>
            <p className="text-sm font-bold text-slate-800">
              {incident.active_sla_name || "No Active SLA"}
            </p>
          </div>
        </div>
        {slaStatus && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${config.badge}`}>
            {slaStatus}
          </span>
        )}
      </div>

      {/* SLA timing */}
      {incident.sla_started_at && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SLA Started</p>
            <p className="text-xs font-semibold text-slate-700">{formatDeadline(incident.sla_started_at)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Deadline</p>
            <p className={`text-xs font-bold ${slaStatus === "Breached" ? "text-red-700" : slaStatus === "At Risk" ? "text-amber-700" : "text-slate-700"}`}>
              {formatDeadline(incident.sla_deadline_at)}
            </p>
          </div>
          {h !== null && slaStatus !== "Completed" && (
            <div className="col-span-2 space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {h >= 0 ? "Time Remaining" : "Overdue By"}
              </p>
              <p className={`text-sm font-bold ${h < 0 ? "text-red-700" : h <= 24 ? "text-amber-700" : "text-emerald-700"}`}>
                {Math.abs(h) >= 24
                  ? `${Math.floor(Math.abs(h) / 24)}d ${Math.abs(h) % 24}h`
                  : `${Math.abs(h)}h`
                }
                {h < 0 ? " overdue" : " remaining"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status chips */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-current border-opacity-10">
        {warrantyStatus && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            warrantyStatus === "OWR"
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-emerald-100 text-emerald-700 border-emerald-200"
          }`}>
            {warrantyStatus === "OWR" ? "⚠ Out of Warranty" : "✓ In Warranty"}
          </span>
        )}
        {incident.fmpi_approval_required && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            CA Approval Required
          </span>
        )}
        {incident.ca_decision === "Approved" && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
            ✓ CA Approved
          </span>
        )}
          {incident.ca_decision === "Rejected" && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            ✗ CA Rejected
          </span>
        )}
        {(incident.operational_priority || incident.initial_priority) && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            (incident.operational_priority || incident.initial_priority) === "P2"
              ? "bg-red-100 text-red-700 border-red-200"
              : "bg-blue-100 text-blue-700 border-blue-200"
          }`}>
            {getPriorityLabel(incident.operational_priority || incident.initial_priority)}
          </span>
        )}
      </div>

      {/* Repair deadline — shown after CA approval or FMPI for In Warranty */}
      {incident.repair_deadline_at && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs">
          <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-500 font-medium">Repair Deadline:</span>
          <span className="font-bold text-slate-800">{formatDeadline(incident.repair_deadline_at)}</span>
          {incident.warranty_status === "OWR" && (
            <span className="text-slate-400 ml-auto">CA Approval + 21 days</span>
          )}
        </div>
      )}

      {/* Next action */}
      <div className="flex items-center gap-2 pt-1 border-t border-current border-opacity-10">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-600 font-medium">
          <span className="text-slate-400">Next: </span>{nextAction}
        </p>
      </div>
    </div>
  );
}