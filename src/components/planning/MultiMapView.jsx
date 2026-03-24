import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MultiMapInstance from "./MultiMapInstance";
import MultiMapControlPanel from "./MultiMapControlPanel";
import { Loader2 } from "lucide-react";

const MIN_LEFT_PCT = 40;
const MIN_RIGHT_PCT = 25;

// Per-panel default state
function defaultPanelState() {
  return {
    selectedWeekId: "",
    filterStatus: "",
    filterType: "",
    filterPriority: "",
    filterCrew: "",
    filterCity: "",
    filterMunicipality: "",
    filterAssetState: "",
    selectedAssetId: null,
  };
}

const ASSET_STATE_MAP = {
  "Active": ["Delivered", "Active"],
  "Under Maintenance": ["Under Maintenance"],
  "Installed": ["Installed"],
};

function applyPanelFilters(assets, assignments, state) {
  const weekAssignments = state.selectedWeekId
    ? assignments.filter(a => a.planning_week_id === state.selectedWeekId)
    : [];

  const assignmentByAsset = {};
  weekAssignments.forEach(a => { assignmentByAsset[a.asset_id] = a; });

  const filteredAssets = assets.filter(a => {
    if (state.filterAssetState) {
      const allowed = ASSET_STATE_MAP[state.filterAssetState] || [state.filterAssetState];
      if (!allowed.includes(a.status)) return false;
    }
    if (state.filterCity && a.city !== state.filterCity) return false;
    if (state.filterMunicipality && a.municipality !== state.filterMunicipality) return false;

    if (state.selectedWeekId) {
      const asgn = assignmentByAsset[a.id];
      if (state.filterStatus && (!asgn || asgn.assignment_status !== state.filterStatus)) return false;
      if (state.filterType && (!asgn || asgn.assignment_type !== state.filterType)) return false;
      if (state.filterPriority && (!asgn || asgn.priority_bucket !== state.filterPriority)) return false;
      if (state.filterCrew && (!asgn || asgn.crew_id !== state.filterCrew)) return false;
    }
    return true;
  });

  const assetIdSet = new Set(filteredAssets.map(a => a.id));
  const filteredAssignments = weekAssignments.filter(a => assetIdSet.has(a.asset_id));

  return { filteredAssets, filteredAssignments, assignmentByAsset };
}

export default function MultiMapView() {
  const [splitPct, setSplitPct] = useState(58);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  // 4 independent panel states
  const [panelStates, setPanelStates] = useState([
    defaultPanelState(), defaultPanelState(), defaultPanelState(), defaultPanelState(),
  ]);

  const updatePanel = useCallback((index, updates) => {
    setPanelStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  // Shared data — fetched once, shared across all panels
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
    staleTime: 60000,
  });
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["planningAssignments"],
    queryFn: () => base44.entities.PlanningAssignments.list(),
    staleTime: 30000,
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

  // Compute derived data per panel (memoised per panel state)
  const panelData = useMemo(() =>
    panelStates.map(state => applyPanelFilters(assets, allAssignments, state)),
    [panelStates, assets, allAssignments]
  );

  // Resizable divider
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
      setSplitPct(Math.min(100 - MIN_RIGHT_PCT, Math.max(MIN_LEFT_PCT, pct)));
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

  const PANEL_COLORS = ["indigo", "emerald", "amber", "purple"];

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-slate-100">
      {/* LEFT: 2×2 Map Grid */}
      <div
        className="grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5 overflow-hidden flex-shrink-0"
        style={{ width: `${splitPct}%`, minWidth: `${MIN_LEFT_PCT}%` }}
      >
        {[0, 1, 2, 3].map(i => {
          const { filteredAssets, filteredAssignments } = panelData[i];
          const state = panelStates[i];
          const color = PANEL_COLORS[i];
          return (
            <div
              key={i}
              className={`relative rounded-lg overflow-hidden border-2 border-${color}-300 bg-white`}
              style={{ isolation: "isolate", minHeight: 0 }}
            >
              {/* Map label badge */}
              <div className={`absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-${color}-100 text-${color}-700 border border-${color}-200 shadow-sm`}>
                Map {i + 1}
              </div>
              <MultiMapInstance
                assets={filteredAssets}
                assignments={filteredAssignments}
                selectedAssetId={state.selectedAssetId}
                onSelectAsset={(asset) => updatePanel(i, { selectedAssetId: asset.id === state.selectedAssetId ? null : asset.id })}
              />
            </div>
          );
        })}
      </div>

      {/* DIVIDER */}
      <div
        onMouseDown={onMouseDown}
        className="w-1.5 flex-shrink-0 bg-slate-300 hover:bg-indigo-400 active:bg-indigo-500 cursor-col-resize transition-colors relative group"
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {[0,1,2,3,4].map(k => <div key={k} className="w-1 h-1 bg-indigo-300 rounded-full" />)}
        </div>
      </div>

      {/* RIGHT: 2×2 Control Panel Grid */}
      <div
        className="grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5 overflow-hidden flex-1"
        style={{ minWidth: `${MIN_RIGHT_PCT}%` }}
      >
        {[0, 1, 2, 3].map(i => (
          <MultiMapControlPanel
            key={i}
            panelIndex={i}
            state={panelStates[i]}
            onUpdate={(updates) => updatePanel(i, updates)}
            panelData={panelData[i]}
            assets={assets}
            allAssignments={allAssignments}
            weeks={weeks}
            crews={crews}
          />
        ))}
      </div>
    </div>
  );
}