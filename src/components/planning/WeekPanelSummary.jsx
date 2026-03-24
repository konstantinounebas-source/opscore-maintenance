import React, { useMemo } from 'react';

export default function WeekPanelSummary({ assignments, compact = false }) {
  const stats = useMemo(() => {
    const total = assignments.length;
    const planned   = assignments.filter(a => a.assignment_status === 'Planned').length;
    const inProg    = assignments.filter(a => a.assignment_status === 'In Progress').length;
    const done      = assignments.filter(a => a.assignment_status === 'Completed').length;
    const deferred  = assignments.filter(a => a.assignment_status === 'Deferred').length;
    const critical  = assignments.filter(a => a.priority_bucket === 'P1' || a.priority_bucket === 'Critical').length;
    const high      = assignments.filter(a => a.priority_bucket === 'P2' || a.priority_bucket === 'High').length;
    const unassigned = assignments.filter(a => !a.crew_id && !a.team_name).length;
    return { total, planned, inProg, done, deferred, critical, high, unassigned };
  }, [assignments]);

  if (compact) {
    // Chip row for 3-4 panels
    return (
      <div className="px-2 py-1.5 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-1">
        <Chip label="Total" value={stats.total} color="bg-slate-100 text-slate-700" />
        <Chip label="Pln" value={stats.planned} color="bg-blue-50 text-blue-700" />
        <Chip label="Act" value={stats.inProg} color="bg-amber-50 text-amber-700" />
        <Chip label="Done" value={stats.done} color="bg-green-50 text-green-700" />
        {stats.critical > 0 && <Chip label="P1" value={stats.critical} color="bg-red-50 text-red-700" />}
        {stats.high > 0 && <Chip label="P2" value={stats.high} color="bg-orange-50 text-orange-700" />}
      </div>
    );
  }

  // Full cards for 1-2 panels
  return (
    <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
      <div className="grid grid-cols-4 gap-1.5">
        <KpiCard label="Total" value={stats.total} color="text-slate-700" bg="bg-white" />
        <KpiCard label="Planned" value={stats.planned} color="text-blue-700" bg="bg-blue-50" />
        <KpiCard label="Active" value={stats.inProg} color="text-amber-700" bg="bg-amber-50" />
        <KpiCard label="Done" value={stats.done} color="text-green-700" bg="bg-green-50" />
        <KpiCard label="Deferred" value={stats.deferred} color="text-slate-500" bg="bg-white" />
        <KpiCard label="P1/Crit" value={stats.critical} color="text-red-700" bg="bg-red-50" />
        <KpiCard label="P2/High" value={stats.high} color="text-orange-700" bg="bg-orange-50" />
        <KpiCard label="No Crew" value={stats.unassigned} color="text-slate-500" bg="bg-white" />
      </div>
    </div>
  );
}

function Chip({ label, value, color }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

function KpiCard({ label, value, color, bg }) {
  return (
    <div className={`${bg} border border-slate-200 rounded px-2 py-1.5 text-center`}>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 leading-tight">{label}</div>
    </div>
  );
}