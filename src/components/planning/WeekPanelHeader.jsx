import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Copy } from 'lucide-react';
import { format } from 'date-fns';

const weekStatusBadge = (status) => {
  const map = {
    Active: "bg-emerald-100 text-emerald-700",
    Draft: "bg-slate-100 text-slate-500",
    Locked: "bg-amber-100 text-amber-700",
    Archived: "bg-slate-100 text-slate-400",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

export default function WeekPanelHeader({ week, onOpenWeek, onDuplicate }) {
  if (!week) return null;

  const dateRange = `${format(new Date(week.start_date), "MMM d")} — ${format(new Date(week.end_date), "MMM d")}`;

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-3 rounded-t-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{week.week_code}</h3>
          <p className="text-xs text-slate-500">{week.week_name}</p>
        </div>
        <Badge className={weekStatusBadge(week.status)}>{week.status}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{dateRange}</span>
        <div className="flex gap-1">
          {onDuplicate && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
              title="Duplicate"
              onClick={onDuplicate}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
          {onOpenWeek && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
              onClick={onOpenWeek}
            >
              Open <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}