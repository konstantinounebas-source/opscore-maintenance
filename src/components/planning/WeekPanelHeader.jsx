import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const weekStatusBadge = (status) => {
  const map = {
    Active:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    Draft:    "bg-slate-100 text-slate-500 border-slate-200",
    Locked:   "bg-amber-100 text-amber-700 border-amber-200",
    Archived: "bg-slate-100 text-slate-400 border-slate-200",
  };
  return map[status] || "bg-slate-100 text-slate-500 border-slate-200";
};

export default function WeekPanelHeader({ week, weeks = [], panelIndex, onWeekChange, onOpenWeek, compact = false }) {
  const dateRange = week
    ? `${format(new Date(week.start_date), "MMM d")} — ${format(new Date(week.end_date), "MMM d, yyyy")}`
    : null;

  const panelLabels = ['Panel A', 'Panel B', 'Panel C', 'Panel D'];

  return (
    <div className="bg-white border-b border-slate-200 px-3 py-2 flex-shrink-0">
      {/* Week selector row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          {panelLabels[panelIndex] || `P${panelIndex + 1}`}
        </span>
        <Select value={week?.id || ''} onValueChange={onWeekChange}>
          <SelectTrigger className="flex-1 h-7 text-xs border-slate-200 font-medium">
            <SelectValue placeholder="Select week..." />
          </SelectTrigger>
          <SelectContent>
            {weeks.map(w => (
              <SelectItem key={w.id} value={w.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{w.week_code}</span>
                  <span className="text-slate-500 truncate max-w-[140px]">{w.week_name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onOpenWeek && week && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50 shrink-0"
            onClick={onOpenWeek}
          >
            Open <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Week info row */}
      {week && !compact && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">{dateRange}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${weekStatusBadge(week.status)}`}>
            {week.status}
          </span>
        </div>
      )}
      {week && compact && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 truncate">{dateRange}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${weekStatusBadge(week.status)}`}>
            {week.status}
          </span>
        </div>
      )}
    </div>
  );
}