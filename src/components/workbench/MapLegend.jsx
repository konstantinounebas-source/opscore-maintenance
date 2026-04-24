import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

function ColorPicker({ color, onChange }) {
  const inputRef = useRef(null);
  return (
    <div
      className="h-3 w-3 rounded-full shrink-0 border border-white shadow-sm cursor-pointer hover:scale-125 transition-transform"
      style={{ backgroundColor: color }}
      title="Click to change color"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={e => onChange(e.target.value)}
        className="opacity-0 absolute w-0 h-0"
      />
    </div>
  );
}

export default function MapLegend({ entries, onColorOverride, onHiddenChange, hiddenValues }) {
  const [open, setOpen] = useState(true);

  if (!entries || entries.length === 0) return null;

  const toggleHidden = (label) => {
    const next = new Set(hiddenValues || []);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    onHiddenChange?.(next);
  };

  return (
    <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm overflow-hidden" style={{ maxWidth: 200 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-50"
      >
        LEGEND
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      {open && (
        <div className="px-2.5 pb-2 space-y-1 max-h-56 overflow-y-auto">
          {entries.map((e, i) => {
            const isHidden = hiddenValues instanceof Set ? hiddenValues.has(e.label) : Array.isArray(hiddenValues) ? hiddenValues.includes(e.label) : false;
            return (
              <div key={i} className={`flex items-center gap-2 group ${isHidden ? "opacity-40" : ""}`}>
                <ColorPicker
                  color={e.color}
                  onChange={newColor => onColorOverride?.(e.label, newColor)}
                />
                <span
                  className="text-[10px] text-slate-600 leading-none flex-1 cursor-pointer select-none hover:text-slate-900"
                  onClick={() => toggleHidden(e.label)}
                  title={isHidden ? "Click to show" : "Click to hide"}
                >
                  <span className="flex items-center justify-between w-full">
                    <span>{e.label}</span>
                    {e.count !== undefined && (
                      <span className="text-slate-400 font-medium">({e.count})</span>
                    )}
                  </span>
                </span>
                <button
                  onClick={() => toggleHidden(e.label)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  title={isHidden ? "Show" : "Hide"}
                >
                  {isHidden
                    ? <EyeOff className="h-2.5 w-2.5 text-slate-400" />
                    : <Eye className="h-2.5 w-2.5 text-slate-400" />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}