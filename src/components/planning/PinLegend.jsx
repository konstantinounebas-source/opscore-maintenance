import React from "react";

const LEGEND_ITEMS = [
  { color: "#EF4444", label: "P1 / Critical" },
  { color: "#F97316", label: "P2 / High" },
  { color: "#3B82F6", label: "Medium" },
  { color: "#22C55E", label: "Low / Completed" },
  { color: "#A78BFA", label: "Deferred" },
  { color: "#9CA3AF", label: "Cancelled / Unassigned" },
];

export default function PinLegend() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Pin Legend</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {LEGEND_ITEMS.map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}