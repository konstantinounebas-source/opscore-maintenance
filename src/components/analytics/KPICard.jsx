import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function KPICard({ label, value, sub, colorClass = "text-slate-800", bgClass = "bg-white border-slate-200", icon: Icon, onDrillDown }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${bgClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 border border-current/10"><Icon className="w-4 h-4 opacity-60" /></div>}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</span>
        </div>
        {onDrillDown && (
          <button onClick={onDrillDown} className="text-slate-400 hover:text-indigo-600 transition-colors" title="View source data">
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className={`text-3xl font-bold tabular-nums ${colorClass}`}>{value ?? "—"}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}