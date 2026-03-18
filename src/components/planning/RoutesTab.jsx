import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Route, ChevronUp, ChevronDown, Loader2, MapPin, Clock, Ruler, Trash2 } from "lucide-react";
import { buildRouteSequence, calcTotalDuration, calcTotalDistance, formatDuration } from "@/components/planning/routeUtils";

export default function RoutesTab({
  selectedWeekId, weekAssignments, assetsMap, crews,
  routes, routeStops, onRefresh
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedCrewId, setSelectedCrewId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reordering, setReordering] = useState(false);

  const weekRoutes = useMemo(() => routes.filter(r => r.planning_week_id === selectedWeekId), [routes, selectedWeekId]);
  const selectedRoute = useMemo(() => weekRoutes.find(r => r.id === selectedRouteId), [weekRoutes, selectedRouteId]);
  const selectedRouteStops = useMemo(() =>
    routeStops.filter(s => s.assignment_route_id === selectedRouteId)
      .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0)),
    [routeStops, selectedRouteId]
  );

  const handleGenerateRoute = async () => {
    if (!selectedWeekId) return;

    const targetAssignments = selectedCrewId
      ? weekAssignments.filter(a => a.crew_id === selectedCrewId && !["Completed", "Cancelled"].includes(a.assignment_status))
      : weekAssignments.filter(a => !["Completed", "Cancelled"].includes(a.assignment_status));

    if (targetAssignments.length === 0) {
      toast({ title: "No assignments to route", description: "Add assignments first.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    const ordered = buildRouteSequence(targetAssignments, assetsMap);
    const totalDuration = calcTotalDuration(ordered);
    const totalDistance = calcTotalDistance(ordered, assetsMap);

    const crew = crews.find(c => c.id === selectedCrewId);
    const routeName = crew
      ? `${crew.crew_name} — Week Route`
      : `Week Route — ${new Date().toLocaleDateString()}`;

    const newRoute = await base44.entities.AssignmentRoutes.create({
      planning_week_id: selectedWeekId,
      crew_id: selectedCrewId || null,
      route_name: routeName,
      route_status: "Suggested",
      total_stops: ordered.length,
      total_distance_km: totalDistance,
      total_estimated_duration_minutes: totalDuration,
    });

    await Promise.all(ordered.map(a =>
      base44.entities.AssignmentRouteStops.create({
        assignment_route_id: newRoute.id,
        planning_assignment_id: a.id,
        stop_order: a._stop_order,
        estimated_service_duration_minutes: a.estimated_duration_minutes || 60,
        stop_status: "Pending",
      })
    ));

    // Update route_sequence_no on assignments
    await Promise.all(ordered.map(a =>
      base44.entities.PlanningAssignments.update(a.id, { route_sequence_no: a._stop_order })
    ));

    queryClient.invalidateQueries({ queryKey: ["assignmentRoutes"] });
    queryClient.invalidateQueries({ queryKey: ["assignmentRouteStops"] });
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    setSelectedRouteId(newRoute.id);
    toast({ title: `Route generated: ${ordered.length} stops` });
    setGenerating(false);
  };

  const handleMoveStop = async (stop, direction) => {
    const stops = [...selectedRouteStops];
    const idx = stops.findIndex(s => s.id === stop.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stops.length) return;

    setReordering(true);
    const a = stops[idx];
    const b = stops[swapIdx];
    await Promise.all([
      base44.entities.AssignmentRouteStops.update(a.id, { stop_order: b.stop_order }),
      base44.entities.AssignmentRouteStops.update(b.id, { stop_order: a.stop_order }),
    ]);
    queryClient.invalidateQueries({ queryKey: ["assignmentRouteStops"] });
    setReordering(false);
  };

  const handleDeleteRoute = async (routeId) => {
    const stops = routeStops.filter(s => s.assignment_route_id === routeId);
    await Promise.all(stops.map(s => base44.entities.AssignmentRouteStops.delete(s.id)));
    await base44.entities.AssignmentRoutes.delete(routeId);
    queryClient.invalidateQueries({ queryKey: ["assignmentRoutes"] });
    queryClient.invalidateQueries({ queryKey: ["assignmentRouteStops"] });
    if (selectedRouteId === routeId) setSelectedRouteId(null);
    toast({ title: "Route deleted" });
  };

  const statusBadge = (s) => {
    const map = { Draft: "bg-slate-100 text-slate-500", Suggested: "bg-blue-100 text-blue-600", Confirmed: "bg-emerald-100 text-emerald-700", Completed: "bg-slate-200 text-slate-500" };
    return map[s] || "bg-slate-100 text-slate-400";
  };

  const stopStatusBadge = (s) => {
    const map = { Pending: "bg-slate-100 text-slate-500", Visited: "bg-blue-100 text-blue-600", Completed: "bg-emerald-100 text-emerald-700", Skipped: "bg-red-100 text-red-500" };
    return map[s] || "bg-slate-100 text-slate-400";
  };

  return (
    <div className="space-y-4">
      {/* Generate controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
            <SelectTrigger className="h-8 text-xs w-44 border-slate-200">
              <SelectValue placeholder="All crews (full week)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All crews (full week)</SelectItem>
              {crews.filter(c => c.is_active !== false).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.crew_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleGenerateRoute} disabled={generating || !selectedWeekId}>
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Route className="w-3 h-3" />}
            Generate Route
          </Button>
        </div>
      </div>

      {/* Route list */}
      {weekRoutes.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Routes this week</span>
          <div className="space-y-1">
            {weekRoutes.map(r => {
              const crew = crews.find(c => c.id === r.crew_id);
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRouteId(selectedRouteId === r.id ? null : r.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedRouteId === r.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <Route className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">{r.route_name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{r.total_stops || 0} stops</span>
                      {r.total_estimated_duration_minutes > 0 && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(r.total_estimated_duration_minutes)}</span>}
                      {r.total_distance_km > 0 && <span className="flex items-center gap-0.5"><Ruler className="w-3 h-3" />{r.total_distance_km} km</span>}
                    </div>
                  </div>
                  {crew && <span className="text-xs text-slate-500 shrink-0">{crew.crew_name}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge(r.route_status)}`}>{r.route_status}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                    onClick={e => { e.stopPropagation(); handleDeleteRoute(r.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Route stops detail */}
      {selectedRoute && (
        <div className="border border-slate-200 rounded-lg bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-600">Stop Sequence — {selectedRoute.route_name}</span>
            <span className="text-xs text-slate-400">{selectedRouteStops.length} stops · {formatDuration(selectedRoute.total_estimated_duration_minutes)}</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {selectedRouteStops.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">No stops</div>
            ) : selectedRouteStops.map((stop, idx) => {
              const assignment = weekAssignments.find(a => a.id === stop.planning_assignment_id);
              const asset = assetsMap[assignment?.asset_id] || {};
              return (
                <div key={stop.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold shrink-0">
                    {stop.stop_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">{asset.asset_name || asset.asset_id || "—"}</div>
                    <div className="text-xs text-slate-400 truncate">{asset.city} {asset.location_address ? `· ${asset.location_address}` : ""}</div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{formatDuration(stop.estimated_service_duration_minutes)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${stopStatusBadge(stop.stop_status)}`}>{stop.stop_status}</span>
                  <div className="flex flex-col gap-0.5">
                    <button disabled={idx === 0 || reordering} onClick={() => handleMoveStop(stop, "up")} className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30">
                      <ChevronUp className="w-3 h-3 text-slate-400" />
                    </button>
                    <button disabled={idx === selectedRouteStops.length - 1 || reordering} onClick={() => handleMoveStop(stop, "down")} className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30">
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {weekRoutes.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          No routes generated yet. Select a crew (optional) and click Generate Route.
        </div>
      )}
    </div>
  );
}