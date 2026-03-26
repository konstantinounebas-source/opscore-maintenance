import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MultiMapInstance from "./MultiMapInstance";
import MapFilterOverlay from "./MapFilterOverlay";
import MapColorLegend from "./MapColorLegend";
import MapWeekPanel from "./MapWeekPanel";
import AssignAssetModal from "./AssignAssetModal";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_LEFT_PCT = 40;
const MIN_RIGHT_PCT = 25;

const MAP_BORDER = [
  "border-indigo-300", "border-emerald-300", "border-amber-300", "border-purple-300"
];
const MAP_BADGE = [
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-purple-100 text-purple-700 border-purple-200",
];

const ASSET_STATE_MAP = {
  "Active": ["Delivered", "Active"],
  "Under Maintenance": ["Under Maintenance"],
  "Installed": ["Installed"],
};

function defaultPanelState() {
  return {
    selectedWeekId: "",
    filterStatus: "",
    filterType: "",
    filterPriority: "",
    filterCrew: "",
    filterCity: "",
    filterAssetState: "",
    assetSearch: "",
    selectedAssetId: null,
  };
}

function applyPanelFilters(assets, assignments, state) {
  const weekAssignments = state.selectedWeekId
    ? assignments.filter(a => a.planning_week_id === state.selectedWeekId)
    : [];

  const assignmentByAsset = {};
  weekAssignments.forEach(a => { assignmentByAsset[a.asset_id] = a; });

  const searchLower = (state.assetSearch || "").trim().toLowerCase();

  const filteredAssets = assets.filter(a => {
    if (state.filterAssetState) {
      const allowed = ASSET_STATE_MAP[state.filterAssetState] || [state.filterAssetState];
      if (!allowed.includes(a.status)) return false;
    }
    if (state.filterCity && a.city !== state.filterCity) return false;

    if (searchLower) {
      const match =
        (a.active_shelter_id || "").toLowerCase().includes(searchLower) ||
        (a.asset_id || "").toLowerCase().includes(searchLower) ||
        (a.city || "").toLowerCase().includes(searchLower) ||
        (a.location_address || "").toLowerCase().includes(searchLower);
      if (!match) return false;
    }

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
  const queryClient = useQueryClient();
  const [splitPct, setSplitPct] = useState(58);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  // Dynamic panel count (1-4)
  const [panelCount, setPanelCount] = useState(4);
  const [panelStates, setPanelStates] = useState([
    defaultPanelState(), defaultPanelState(), defaultPanelState(), defaultPanelState(),
  ]);

  // Assign modal state
  const [assignModal, setAssignModal] = useState({
    open: false, panelIndex: null, asset: null, existingAssignment: null
  });

  const updatePanel = useCallback((index, updates) => {
    setPanelStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const addPanel = () => {
    if (panelCount < 4) setPanelCount(c => c + 1);
  };
  const removePanel = (idx) => {
    setPanelCount(c => Math.max(1, c - 1));
    setPanelStates(prev => {
      const next = [...prev];
      next[idx] = defaultPanelState();
      return next;
    });
  };

  // Shared data
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
  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incidents.list(),
  });
  const { data: workOrders = [] } = useQuery({
    queryKey: ["workOrders"],
    queryFn: () => base44.entities.WorkOrders.list(),
  });

  const isLoading = assetsLoading || assignmentsLoading;

  // Per-panel derived data
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

  // Handle asset click on map → open assign modal
  const handleAssetClick = useCallback((panelIndex, asset) => {
    const state = panelStates[panelIndex];
    if (state.selectedAssetId === asset.id) {
      updatePanel(panelIndex, { selectedAssetId: null });
      return;
    }
    updatePanel(panelIndex, { selectedAssetId: asset.id });
    const week = weeks.find(w => w.id === state.selectedWeekId);
    const existingAssignment = panelData[panelIndex].assignmentByAsset[asset.id] || null;
    setAssignModal({ open: true, panelIndex, asset, existingAssignment, week });
  }, [panelStates, panelData, weeks, updatePanel]);

  const handleSaveAssignment = async (formData, existingId) => {
    if (existingId) {
      await base44.entities.PlanningAssignments.update(existingId, formData);
    } else {
      await base44.entities.PlanningAssignments.create(formData);
    }
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
  };

  const handleDeleteAssignment = async (id) => {
    await base44.entities.PlanningAssignments.delete(id);
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-slate-500">Loading planning data…</span>
      </div>
    );
  }

  // Grid layout based on panel count
  const getGridClass = (count) => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count === 3) return "grid-cols-2 grid-rows-2";
    return "grid-cols-2 grid-rows-2";
  };

  const activePanels = Array.from({ length: panelCount }, (_, i) => i);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-slate-100">

      {/* LEFT: Maps grid */}
      <div
        className={`grid ${getGridClass(panelCount)} gap-1.5 p-1.5 flex-shrink-0`}
        style={{ width: `${splitPct}%`, minWidth: `${MIN_LEFT_PCT}%`, overflow: "hidden" }}
      >
        {activePanels.map(i => {
          const { filteredAssets, filteredAssignments, assignmentByAsset } = panelData[i];
          const state = panelStates[i];

          return (
            <div
              key={i}
              className={`relative rounded-lg overflow-hidden border-2 ${MAP_BORDER[i]} bg-white`}
              style={{ isolation: "isolate", minHeight: 0, height: "100%" }}
            >
              {/* Map label badge */}
              <div className={`absolute top-1.5 left-1.5 z-[600] px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${MAP_BADGE[i]}`}>
                Map {i + 1}
              </div>

              {/* Remove panel button (only when >1 panel) */}
              {panelCount > 1 && (
                <button
                  onClick={() => removePanel(i)}
                  className="absolute top-1.5 right-1.5 z-[600] w-5 h-5 rounded-full bg-white/90 border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 flex items-center justify-center shadow-sm transition-colors"
                  title="Remove map"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Filter overlay on top of map */}
              <MapFilterOverlay
                state={state}
                onUpdate={(updates) => updatePanel(i, updates)}
                assets={assets}
                crews={crews}
              />

              {/* Map */}
              <MultiMapInstance
                assets={filteredAssets}
                assignments={filteredAssignments}
                selectedAssetId={state.selectedAssetId}
                onSelectAsset={(asset) => handleAssetClick(i, asset)}
              />

              {/* Color legend at bottom */}
              <MapColorLegend assignments={filteredAssignments} />
            </div>
          );
        })}

        {/* Add map button — shown in the next empty cell if < 4 */}
        {panelCount < 4 && (
          <div className={`relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-center ${panelCount === 1 ? "" : ""}`}
            style={{ minHeight: 100 }}
          >
            <button
              onClick={addPanel}
              className="flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 group-hover:border-indigo-400 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Add Map</span>
            </button>
          </div>
        )}
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

      {/* RIGHT: Week + Assignment panels */}
      <div
        className={`grid ${getGridClass(panelCount)} gap-1.5 p-1.5 overflow-hidden flex-1`}
        style={{ minWidth: `${MIN_RIGHT_PCT}%` }}
      >
        {activePanels.map(i => (
          <MapWeekPanel
            key={i}
            panelIndex={i}
            state={panelStates[i]}
            onUpdate={(updates) => updatePanel(i, updates)}
            panelData={panelData[i]}
            assets={assets}
            weeks={weeks}
          />
        ))}
        {/* Placeholder for add map slot on right */}
        {panelCount < 4 && (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/40" />
        )}
      </div>

      {/* Assign Asset Modal */}
      <AssignAssetModal
        open={assignModal.open}
        onOpenChange={(v) => {
          setAssignModal(prev => ({ ...prev, open: v }));
          if (!v) updatePanel(assignModal.panelIndex ?? 0, { selectedAssetId: null });
        }}
        asset={assignModal.asset}
        week={assignModal.week}
        weeks={weeks}
        existingAssignment={assignModal.existingAssignment}
        incidents={incidents}
        workOrders={workOrders}
        onSave={handleSaveAssignment}
        onDelete={handleDeleteAssignment}
        onWeekCreated={() => queryClient.invalidateQueries({ queryKey: ["planningWeeks"] })}
      />
    </div>
  );
}