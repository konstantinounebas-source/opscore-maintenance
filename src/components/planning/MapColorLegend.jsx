import React from "react";

const LEGEND_ITEMS = [
  { color: "#EF4444", label: "P1 – High Priority" },
  { color: "#F97316", label: "P2 – Medium Priority" },
  { color: "#3B82F6", label: "Planned" },
  { color: "#F59E0B", label: "In Progress" },
  { color: "#22C55E", label: "Completed" },
  { color: "#A78BFA", label: "Deferred" },
  { color: "#CBD5E1", label: "Unassigned" },
];

export default function MapColorLegend({ assignments }) {
  // Only show colors that are actually present
  const usedColors = new Set();
  usedColors.add("#CBD5E1"); // always show unassigned

  assignments.forEach(a => {
    if (a.assignment_status === "Completed") usedColors.add("#22C55E");
    else if (a.assignment_status === "Deferred") usedColors.add("#A78BFA");
    else if (a.priority_bucket === "P1") usedColors.add("#EF4444");
    else if (a.priority_bucket === "P2") usedColors.add("#F97316");
    else if (a.assignment_status === "In Progress") usedColors.add("#F59E0B");
    else if (a.assignment_status === "Planned") usedColors.add("#3B82F6");
  });

  const visible = LEGEND_ITEMS.filter(i => usedColors.has(i.color));

  return (
    <div
      className="absolute bottom-1.5 left-1.5 right-1.5 z-[500] pointer-events-none"
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {visible.map(item => (
            <div key={item.color} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white shadow-sm" style={{ background: item.color }} />
              <span className="text-[9px] text-slate-600 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}