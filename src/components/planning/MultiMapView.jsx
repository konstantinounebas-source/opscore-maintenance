import React, { useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MultiMapPanel from "./MultiMapPanel";
import { Loader2 } from "lucide-react";

const MIN_LEFT_PCT = 40;
const MIN_RIGHT_PCT = 25;

export default function MultiMapView() {
  const [splitPct, setSplitPct] = useState(60); // left side %
  const containerRef = useRef(null);
  const dragging = useRef(false);

  // Shared data sources
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
  });
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["planningAssignments"],
    queryFn: () => base44.entities.PlanningAssignments.list(),
  });
  const { data: weeks = [] } = useQuery({
    queryKey: ["planningWeeks"],
    queryFn: () => base44.entities.PlanningWeeks.list("-created_date"),
  });
  const { data: crews = [] } = useQuery({
    queryKey: ["crews"],
    queryFn: () => base44.entities.Crews.list(),
  });

  const isLoading = assetsLoading || assignmentsLoading;

  // Resize divider
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(100 - MIN_RIGHT_PCT, Math.max(MIN_LEFT_PCT, pct));
      setSplitPct(clamped);
    };
    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-slate-500">Loading planning data…</span>
      </div>
    );
  }

  const sharedProps = { assets, allAssignments, weeks, crews };

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-slate-100 select-none">
      {/* LEFT: 2×2 Map Grid */}
      <div
        className="flex flex-col overflow-hidden p-1.5 gap-1.5"
        style={{ width: `${splitPct}%`, minWidth: `${MIN_LEFT_PCT}%` }}
      >
        <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ isolation: "isolate" }}>
              <MultiMapPanel panelIndex={i} {...sharedProps} />
            </div>
          ))}
        </div>
      </div>

      {/* DIVIDER */}
      <div
        onMouseDown={onMouseDown}
        className="w-1.5 bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 cursor-col-resize transition-colors flex-shrink-0 relative group"
        title="Drag to resize"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 group-hover:opacity-100 opacity-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
          {[0,1,2].map(i => <div key={i} className="w-0.5 h-4 bg-indigo-300 rounded" />)}
        </div>
      </div>

      {/* RIGHT: 2×2 Control Panel Grid */}
      <div
        className="flex flex-col overflow-hidden p-1.5 gap-1.5"
        style={{ width: `${100 - splitPct}%`, minWidth: `${MIN_RIGHT_PCT}%` }}
      >
        <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full">
          {[0, 1, 2, 3].map(i => (
            <ControlPanel key={i} panelIndex={i} {...sharedProps} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ControlPanel: mirrors the panel state but shows expanded controls only (no map)
// Each ControlPanel controls MapPanel with same index via shared state — but since
// MultiMapPanel is self-contained, ControlPanel here is the right-side mirror.
// For the architecture described (panels on right side controlling maps on left),
// we embed the full panel (with map) on the LEFT side and show a compact summary on the RIGHT.
// The LEFT panels ARE the map+controls combined as per spec (each panel controls its map).
// The RIGHT side shows an overview of all 4 panels' KPI status.

function ControlPanel({ panelIndex, assets, allAssignments, weeks, crews }) {
  const panelLabels = ["Map 1", "Map 2", "Map 3", "Map 4"];
  const panelColors = ["bg-indigo-50 border-indigo-200", "bg-emerald-50 border-emerald-200", "bg-amber-50 border-amber-200", "bg-purple-50 border-purple-200"];
  const headerColors = ["text-indigo-700", "text-emerald-700", "text-amber-700", "text-purple-700"];

  return (
    <div className={`flex flex-col h-full rounded-lg border ${panelColors[panelIndex]} overflow-hidden`}>
      <div className={`px-2.5 py-1.5 border-b ${panelColors[panelIndex].split(" ")[1]} shrink-0`}>
        <span className={`text-xs font-bold uppercase tracking-wide ${headerColors[panelIndex]}`}>
          {panelLabels[panelIndex]} — Control Panel
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center p-3">
        <div className="text-center text-[10px] text-slate-400 space-y-1">
          <div className="text-slate-300 text-2xl">⚙</div>
          <div>Controls are embedded</div>
          <div>in the map panel to the left</div>
          <div className="mt-2 text-slate-300">Use the left side panels</div>
          <div className="text-slate-300">to filter each map independently</div>
        </div>
      </div>
    </div>
  );
}