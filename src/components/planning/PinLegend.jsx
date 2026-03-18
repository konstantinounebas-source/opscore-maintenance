import React from "react";
import { PIN_COLORS } from "./planningUtils";

const LEGEND_ITEMS = [
  { color: PIN_COLORS.p1,         label: "P1 / Critical" },
  { color: PIN_COLORS.p2,         label: "P2 / High" },
  { color: PIN_COLORS.medium,     label: "Medium" },
  { color: PIN_COLORS.low,        label: "Low" },
  { color: PIN_COLORS.completed,  label: "Completed" },
  { color: PIN_COLORS.deferred,   label: "Deferred" },
  { color: PIN_COLORS.cancelled,  label: "Cancelled" },
  { color: PIN_COLORS.unassigned, label: "Unassigned" },
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