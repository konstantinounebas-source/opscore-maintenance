import React, { useState, useEffect } from "react";
import { differenceInSeconds, addHours } from "date-fns";
import { Clock, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

/**
 * SLAResponseClock — prominent countdown banner shown on IncidentDetail.
 *
 * Contractual SLA rules:
 *   P1 (Χαμηλή):  Confirmation of receipt ≤ 24h (from next business day)
 *   P2 (Υψηλή):   Same-day confirmation + Make-Safe actions within 24h
 *
 * Clock starts from incident_created_at.
 * Disappears once CR+OMPI is submitted (workflow_state !== "Awaiting_CR_OMPI").
 */

function getDeadline(createdAt, priority) {
  if (!createdAt) return null;
  // Both P1 and P2 require action within 24 hours of creation
  return addHours(new Date(createdAt), 24);
}

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
}

export default function SLAResponseClock({ incident }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!incident) return null;

  const workflowState = incident.workflow_state || "Awaiting_CR_OMPI";
  const priority = incident.initial_priority || incident.operational_priority;

  // Only show clock while still awaiting CR+OMPI
  if (workflowState !== "Awaiting_CR_OMPI") return null;
  if (!priority || !incident.incident_created_at) return null;

  const deadline = getDeadline(incident.incident_created_at, priority);
  if (!deadline) return null;

  const totalSecondsLeft = differenceInSeconds(deadline, now);
  const isBreached = totalSecondsLeft <= 0;
  const isAtRisk = !isBreached && totalSecondsLeft <= 4 * 3600; // ≤ 4h remaining
  const countdown = formatCountdown(Math.abs(totalSecondsLeft));

  const isP2 = priority === "P2";

  const config = isBreached
    ? { bg: "bg-red-600", text: "text-white", badge: "bg-red-800", icon: XCircle, label: "SLA BREACHED", sublabel: "Response deadline has passed!" }
    : isAtRisk
    ? { bg: "bg-amber-50 border border-amber-300", text: "text-amber-900", badge: "bg-amber-100", icon: AlertTriangle, label: "SLA AT RISK", sublabel: isP2 ? "P2: Same-day confirmation + Make-Safe required" : "P2: Confirmation of receipt required within 24h" }
    : { bg: "bg-indigo-50 border border-indigo-200", text: "text-indigo-900", badge: "bg-indigo-100", icon: Clock, label: "SLA CLOCK RUNNING", sublabel: isP2 ? "P2 (Υψηλή): Same-day confirmation + Make-Safe within 24h" : "P1 (Χαμηλή): Confirmation of receipt within 24h (next business day)" };

  const Icon = config.icon;

  return (
    <div className={`rounded-xl p-4 ${config.bg} ${config.text}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: label */}
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.badge}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">{config.label}</p>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isP2
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isP2 ? "P2 – Υψηλή" : "P1 – Χαμηλή"}
              </span>
            </div>
            <p className="text-xs font-medium mt-0.5 opacity-80">{config.sublabel}</p>
          </div>
        </div>

        {/* Right: countdown */}
        <div className="flex items-center gap-1.5">
          {countdown && (
            <>
              <TimeUnit value={countdown.h} label="h" breached={isBreached} atRisk={isAtRisk} />
              <span className="text-lg font-bold opacity-60">:</span>
              <TimeUnit value={countdown.m} label="m" breached={isBreached} atRisk={isAtRisk} />
              <span className="text-lg font-bold opacity-60">:</span>
              <TimeUnit value={countdown.s} label="s" breached={isBreached} atRisk={isAtRisk} />
              {isBreached && <span className="ml-2 text-xs font-bold text-red-200">overdue</span>}
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isBreached && (
        <div className="mt-3 h-1.5 rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtRisk ? "bg-amber-500" : "bg-indigo-500"}`}
            style={{ width: `${Math.max(0, Math.min(100, (totalSecondsLeft / (24 * 3600)) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function TimeUnit({ value, label, breached, atRisk }) {
  const bg = breached ? "bg-red-800" : atRisk ? "bg-amber-200" : "bg-white/60";
  const text = breached ? "text-white" : atRisk ? "text-amber-900" : "text-indigo-900";
  return (
    <div className={`rounded-lg px-2.5 py-1 min-w-[44px] text-center ${bg}`}>
      <p className={`text-xl font-mono font-black leading-none ${text}`}>
        {String(value).padStart(2, "0")}
      </p>
      <p className={`text-[9px] font-bold uppercase opacity-60 ${text}`}>{label}</p>
    </div>
  );
}