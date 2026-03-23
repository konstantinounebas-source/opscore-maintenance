import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function WeekPanelAssignments({ assignments, assetsMap, onSelectAssignment }) {
  const displayAssignments = useMemo(() => {
    return assignments.slice(0, 8); // Show first 8 for compact view
  }, [assignments]);

  const priorityColor = (priority) => {
    const map = {
      'P1': 'text-red-600 font-semibold',
      'P2': 'text-orange-600 font-semibold',
      'Critical': 'text-red-600 font-semibold',
      'High': 'text-orange-600 font-semibold',
      'Medium': 'text-slate-600',
      'Low': 'text-slate-500',
    };
    return map[priority] || 'text-slate-600';
  };

  const statusColor = (status) => {
    const map = {
      'Planned': 'text-slate-600',
      'In Progress': 'text-amber-600 font-semibold',
      'Completed': 'text-green-600',
      'Deferred': 'text-slate-500',
    };
    return map[status] || 'text-slate-600';
  };

  return (
    <div className="px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
      {displayAssignments.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">No assignments</p>
      ) : (
        displayAssignments.map((assignment) => {
          const asset = assetsMap[assignment.asset_id] || {};
          return (
            <div
              key={assignment.id}
              className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
              onClick={() => onSelectAssignment?.(assignment)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-slate-700 truncate">{asset.asset_id}</p>
                <p className="text-slate-500 text-[11px] truncate">{asset.location_address}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[11px] ${statusColor(assignment.assignment_status)}`}>
                  {assignment.assignment_status?.substring(0, 3)}
                </span>
                <span className={`text-[11px] ${priorityColor(assignment.priority_bucket)}`}>
                  {assignment.priority_bucket}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
              </div>
            </div>
          );
        })
      )}
      {assignments.length > 8 && (
        <p className="text-xs text-slate-400 py-1 text-center">+{assignments.length - 8} more</p>
      )}
    </div>
  );
}