import React from "react";

function KPICard({ label, value, color = "slate" }) {
  const colorMap = {
    slate:   "bg-slate-50 border-slate-200 text-slate-700",
    indigo:  "bg-indigo-50 border-indigo-200 text-indigo-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red:     "bg-red-50 border-red-200 text-red-700",
    orange:  "bg-orange-50 border-orange-200 text-orange-700",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 flex flex-col gap-1 ${colorMap[color] || colorMap.slate}`}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

export default function PlanningKPIBar({ assignments }) {
  const total = assignments.length;
  const planned = assignments.filter(a => a.assignment_status === "Planned").length;
  const inProgress = assignments.filter(a => a.assignment_status === "In Progress").length;
  const completed = assignments.filter(a => a.assignment_status === "Completed").length;
  const p1p2 = assignments.filter(a => a.priority_bucket === "P1" || a.priority_bucket === "P2").length;

  return (
    <div className="grid grid-cols-5 gap-3">
      <KPICard label="Total Assigned" value={total} color="indigo" />
      <KPICard label="Planned" value={planned} color="slate" />
      <KPICard label="In Progress" value={inProgress} color="amber" />
      <KPICard label="Completed" value={completed} color="emerald" />
      <KPICard label="P1 / P2" value={p1p2} color="red" />
    </div>
  );
}