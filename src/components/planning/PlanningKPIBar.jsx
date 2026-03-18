import React from "react";

function KPICard({ label, value, color = "text-slate-700" }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg px-3 py-2 min-w-[72px]">
      <span className={`text-lg font-bold leading-none ${color}`}>{value ?? 0}</span>
      <span className="text-xs text-slate-400 mt-1 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function PlanningKPIBar({ assignments, label = "" }) {
  const total    = assignments.length;
  const planned  = assignments.filter(a => a.assignment_status === "Planned").length;
  const inProg   = assignments.filter(a => a.assignment_status === "In Progress").length;
  const done     = assignments.filter(a => a.assignment_status === "Completed").length;
  const deferred = assignments.filter(a => a.assignment_status === "Deferred").length;
  const p1       = assignments.filter(a => a.priority_bucket === "P1" || a.priority_bucket === "Critical").length;
  const p2       = assignments.filter(a => a.priority_bucket === "P2" || a.priority_bucket === "High").length;

  return (
    <div>
      {label && <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</div>}
      <div className="flex gap-2 flex-wrap">
        <KPICard label="Total"       value={total}    color="text-slate-700" />
        <KPICard label="Planned"     value={planned}  color="text-slate-600" />
        <KPICard label="In Progress" value={inProg}   color="text-blue-600" />
        <KPICard label="Completed"   value={done}     color="text-emerald-600" />
        <KPICard label="Deferred"    value={deferred} color="text-purple-600" />
        <KPICard label="P1/Critical" value={p1}       color="text-red-600" />
        <KPICard label="P2/High"     value={p2}       color="text-orange-600" />
      </div>
    </div>
  );
}