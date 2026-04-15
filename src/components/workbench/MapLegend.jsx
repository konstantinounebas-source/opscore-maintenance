import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function MapLegend({ entries }) {
  const [open, setOpen] = useState(true);
  if (!entries || entries.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm overflow-hidden" style={{ maxWidth: 180 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-50"
      >
        Legend
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      {open && (
        <div className="px-2.5 pb-2 space-y-1 max-h-48 overflow-y-auto">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: e.color }} />
              <span className="text-[10px] text-slate-600 leading-none">{e.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}