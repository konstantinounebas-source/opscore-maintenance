import React from "react";
import { format } from "date-fns";
import { Clock, User, FileText, Image } from "lucide-react";

export default function AuditLog({ entries }) {
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">No log entries yet</p>;
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => (
        <div key={entry.id || idx} className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-900 font-medium">{entry.action}</p>
            {entry.details && <p className="text-xs text-slate-500 mt-0.5">{entry.details}</p>}
            {entry.note && <p className="text-xs text-slate-500 mt-0.5 italic">{entry.note}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.user || entry.created_by || "System"}
              </span>
              <span>{entry.created_date ? format(new Date(entry.created_date), "MMM d, yyyy HH:mm") : "—"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}