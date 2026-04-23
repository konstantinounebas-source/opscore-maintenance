import React, { useState, useEffect } from "react";
import { differenceInSeconds, format } from "date-fns";
import { Clock, AlertTriangle, CheckCircle2, XCircle, Shield } from "lucide-react";

/**
 * SLADeadlinePanel — displays the three SLA deadlines:
 *   1. Acknowledgement deadline (CR+OMPI)
 *   2. Make Safe deadline (P2 only)
 *   3. Restoration deadline
 */

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function DeadlineRow({ label, deadline, completedAt, hide }) {
  const now = useNow();
  if (hide || !deadline) return null;

  const deadlineDate = new Date(deadline);
  const secsLeft = differenceInSeconds(deadlineDate, now);
  const breached = secsLeft <= 0 && !completedAt;
  const completed = !!completedAt;
  const atRisk = !breached && !completed && secsLeft <= 4 * 3600;

  const absLeft = Math.abs(secsLeft);
  const h = Math.floor(absLeft / 3600);
  const m = Math.floor((absLeft % 3600) / 60);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const deadlineFmt = format(deadlineDate, "dd/MM/yyyy HH:mm");

  if (completed) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-800">{label}</p>
          <p className="text-[10px] text-green-600">Completed · Due: {deadlineFmt}</p>
        </div>
      </div>
    );
  }

  if (breached) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-red-50 border border-red-300">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-800">{label}</p>
          <p className="text-[10px] text-red-600">BREACHED — {timeStr} overdue · Was due: {deadlineFmt}</p>
        </div>
        <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">BREACH</span>
      </div>
    );
  }

  if (atRisk) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-amber-50 border border-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800">{label}</p>
          <p className="text-[10px] text-amber-600">{timeStr} remaining · Due: {deadlineFmt}</p>
        </div>
        <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">AT RISK</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-200">
      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-500">{timeStr} remaining · Due: {deadlineFmt}</p>
      </div>
      <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">ON TRACK</span>
    </div>
  );
}

export default function SLADeadlinePanel({ incident }) {
  if (!incident) return null;

  const priority = incident.operational_priority || incident.initial_priority;
  const isP2 = priority === "P2";
  const isClosed = incident.workflow_state === "Closed" || incident.workflow_state === "Cancelled";

  const hasAnyDeadline = incident.acknowledgement_deadline || incident.make_safe_deadline || incident.restoration_deadline;
  if (!hasAnyDeadline) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-indigo-500" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA Deadlines</p>
        {priority && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isP2 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
            {isP2 ? "P2 – Υψηλή" : "P1 – Χαμηλή"}
          </span>
        )}
      </div>

      <DeadlineRow
        label="Acknowledgement (CR+OMPI)"
        deadline={incident.acknowledgement_deadline}
        completedAt={incident.cr_ompi_submitted_at}
      />

      <DeadlineRow
        label="Make Safe Completion"
        deadline={incident.make_safe_deadline}
        completedAt={incident.make_safe_completed_at}
        hide={!isP2 && !incident.make_safe_deadline}
      />

      <DeadlineRow
        label="Restoration / Repair"
        deadline={incident.restoration_deadline || incident.repair_deadline_at}
        completedAt={isClosed ? incident.closed_at : null}
      />
    </div>
  );
}