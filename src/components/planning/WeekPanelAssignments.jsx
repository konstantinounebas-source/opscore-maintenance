import React, { useMemo } from 'react';

const PRIORITY_COLOR = {
  P1: 'text-red-600 font-semibold', P2: 'text-orange-600 font-semibold',
  Critical: 'text-red-600 font-semibold', High: 'text-orange-600 font-semibold',
  Medium: 'text-slate-600', Low: 'text-slate-500',
};
const STATUS_STYLE = {
  Planned: 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Deferred: 'bg-slate-100 text-slate-400',
  Cancelled: 'bg-red-50 text-red-400',
};

// compact = true for 3-4 panels, false for 1-2
export default function WeekPanelAssignments({ assignments, assetsMap, onSelectAssignment, compact = false }) {
  const limit = compact ? 6 : 10;
  const display = useMemo(() => assignments.slice(0, limit), [assignments, limit]);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          Assignments
        </span>
        <span className="text-[10px] text-slate-400">{assignments.length} total</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto" style={{ maxHeight: compact ? 120 : 180 }}>
        {display.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-400">No assignments</div>
        ) : (
          display.map(a => {
            const asset = assetsMap[a.asset_id] || {};
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0 group transition-colors"
                onClick={() => onSelectAssignment?.(a)}
              >
                <span className="font-mono text-[11px] text-slate-700 shrink-0 w-16 truncate">
                  {asset.asset_id || '—'}
                </span>
                {!compact && (
                  <span className="text-[11px] text-slate-500 flex-1 truncate">
                    {asset.location_address || asset.city || '—'}
                  </span>
                )}
                <span className={`text-[10px] px-1 py-0.5 rounded shrink-0 ${STATUS_STYLE[a.assignment_status] || 'bg-slate-100 text-slate-500'}`}>
                  {compact ? a.assignment_status?.substring(0, 3) : a.assignment_status}
                </span>
                <span className={`text-[10px] shrink-0 ${PRIORITY_COLOR[a.priority_bucket] || 'text-slate-500'}`}>
                  {a.priority_bucket || '—'}
                </span>
              </div>
            );
          })
        )}
        {assignments.length > limit && (
          <div className="px-3 py-1.5 text-[11px] text-slate-400 text-center border-t border-slate-100">
            +{assignments.length - limit} more
          </div>
        )}
      </div>
    </div>
  );
}