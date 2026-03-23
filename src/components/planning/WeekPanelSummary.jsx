import React, { useMemo } from 'react';

export default function WeekPanelSummary({ assignments }) {
  const stats = useMemo(() => {
    const total = assignments.length;
    const planned = assignments.filter(a => a.assignment_status === 'Planned').length;
    const inProgress = assignments.filter(a => a.assignment_status === 'In Progress').length;
    const completed = assignments.filter(a => a.assignment_status === 'Completed').length;
    const deferred = assignments.filter(a => a.assignment_status === 'Deferred').length;
    const critical = assignments.filter(a => a.priority_bucket === 'P1' || a.priority_bucket === 'Critical').length;
    const high = assignments.filter(a => a.priority_bucket === 'P2' || a.priority_bucket === 'High').length;
    const unassigned = assignments.filter(a => !a.crew_id).length;

    return { total, planned, inProgress, completed, deferred, critical, high, unassigned };
  }, [assignments]);

  const Stat = ({ label, value, color = 'text-slate-700' }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 space-y-1 text-xs">
      <div className="grid grid-cols-2 gap-2 pb-2">
        <Stat label="Total" value={stats.total} />
        <Stat label="Planned" value={stats.planned} />
        <Stat label="In Progress" value={stats.inProgress} color="text-amber-600" />
        <Stat label="Completed" value={stats.completed} color="text-green-600" />
        <Stat label="Critical" value={stats.critical} color="text-red-600" />
        <Stat label="High" value={stats.high} color="text-orange-600" />
      </div>
    </div>
  );
}