import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Users, AlertTriangle, CheckCircle2, Clock, Plus, RefreshCw } from "lucide-react";
import { assignmentStatusColor, priorityBucketColor } from "@/components/planning/planningUtils";

function CrewCapacityCard({ crew, assignments, onSelect, isSelected }) {
  const assigned = assignments.filter(a => a.crew_id === crew.id);
  const capacity = crew.capacity_per_week || 0;
  const pct = capacity > 0 ? Math.round((assigned.length / capacity) * 100) : 0;
  const overloaded = capacity > 0 && assigned.length > capacity;

  return (
    <div
      onClick={() => onSelect(crew)}
      className={`cursor-pointer border rounded-lg p-3 transition-all ${isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: crew.color_code || "#94a3b8" }} />
          <span className="text-sm font-semibold text-slate-800">{crew.crew_name}</span>
        </div>
        {overloaded && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-slate-500 mb-2">
        <span>Tasks: <span className={`font-medium ${overloaded ? "text-orange-600" : "text-slate-700"}`}>{assigned.length}</span></span>
        <span>Cap/wk: <span className="font-medium text-slate-700">{capacity || "—"}</span></span>
        <span className="text-xs">{crew.base_city || "—"}</span>
        <span className={`text-xs font-medium ${overloaded ? "text-orange-600" : "text-emerald-600"}`}>{capacity > 0 ? `${pct}%` : "No cap set"}</span>
      </div>
      {capacity > 0 && (
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${overloaded ? "bg-orange-400" : pct > 75 ? "bg-amber-400" : "bg-emerald-400"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function CrewSchedulerTab({
  selectedWeekId, weeks, weekAssignments, allAssignments,
  crews, assetsMap, onRefresh
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCrewId, setSelectedCrewId] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedCrew = useMemo(() => crews.find(c => c.id === selectedCrewId), [crews, selectedCrewId]);

  const crewAssignments = useMemo(() => {
    if (!selectedCrewId) return weekAssignments.filter(a => !a.crew_id);
    return weekAssignments.filter(a => a.crew_id === selectedCrewId);
  }, [selectedCrewId, weekAssignments]);

  const unassignedAssignments = useMemo(() => weekAssignments.filter(a => !a.crew_id), [weekAssignments]);

  const handleAssignToCrew = async (assignmentId, crewId) => {
    setSaving(true);
    await base44.entities.PlanningAssignments.update(assignmentId, { crew_id: crewId || null });
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    toast({ title: crewId ? "Assigned to crew" : "Crew removed" });
    setSaving(false);
  };

  const handleBulkAssign = async (crewId) => {
    if (!crewId) return;
    const crew = crews.find(c => c.id === crewId);
    const capacity = crew?.capacity_per_week || 0;
    const currentCount = weekAssignments.filter(a => a.crew_id === crewId).length;
    const available = capacity > 0 ? capacity - currentCount : Infinity;

    // Sort unassigned by priority then scheduling_score desc so highest-priority items fill first
    const PRIORITY_ORDER = { P1: 0, Critical: 1, P2: 2, High: 3, Medium: 4, Low: 5 };
    const sorted = [...unassignedAssignments].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority_bucket] ?? 6;
      const pb = PRIORITY_ORDER[b.priority_bucket] ?? 6;
      if (pa !== pb) return pa - pb;
      return (b.scheduling_score || 0) - (a.scheduling_score || 0);
    });

    const toAssign = isFinite(available) ? sorted.slice(0, available) : sorted;
    const skipped = sorted.length - toAssign.length;

    if (toAssign.length === 0) {
      toast({ title: capacity > 0 ? `${crew.crew_name} is already at capacity` : "No unassigned tasks" });
      return;
    }

    setSaving(true);
    await Promise.all(toAssign.map(a => base44.entities.PlanningAssignments.update(a.id, { crew_id: crewId })));
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    const msg = skipped > 0
      ? `Assigned ${toAssign.length} tasks to ${crew?.crew_name} (${skipped} skipped — at capacity)`
      : `Assigned ${toAssign.length} tasks to ${crew?.crew_name}`;
    toast({ title: msg });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Crew Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Crew Workload</span>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>{unassignedAssignments.length} unassigned</span>
          </div>
        </div>
        {crews.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
            No crews configured. Go to the Crews page to add crews.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {crews.filter(c => c.is_active !== false).map(crew => (
              <CrewCapacityCard
                key={crew.id}
                crew={crew}
                assignments={weekAssignments}
                onSelect={c => setSelectedCrewId(selectedCrewId === c.id ? null : c.id)}
                isSelected={selectedCrewId === crew.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Assignment list */}
      <div className="border border-slate-200 rounded-lg bg-white">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600">
            {selectedCrew ? `${selectedCrew.crew_name} — Assignments` : "Unassigned Assignments"}
          </span>
          <div className="flex items-center gap-1">
            {selectedCrew && unassignedAssignments.length > 0 && (
              <Button size="sm" variant="outline" className="h-6 text-xs" disabled={saving}
                onClick={() => handleBulkAssign(selectedCrewId)}>
                Bulk Assign Unassigned
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onRefresh}>
              <RefreshCw className="w-3 h-3 text-slate-400" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
          {crewAssignments.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-xs">No assignments</div>
          ) : crewAssignments.map(a => {
            const asset = assetsMap[a.asset_id] || {};
            return (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700 truncate">{asset.asset_name || asset.asset_id || "—"}</div>
                  <div className="text-xs text-slate-400 truncate">{asset.city} {asset.location_address ? `· ${asset.location_address}` : ""}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityBucketColor(a.priority_bucket)}`}>{a.priority_bucket || "—"}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${assignmentStatusColor(a.assignment_status)}`}>{a.assignment_status}</span>
                </div>
                <Select
                  value={a.crew_id || "none"}
                  onValueChange={v => handleAssignToCrew(a.id, v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-6 text-xs w-28 border-slate-200">
                    <SelectValue placeholder="No crew" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No crew —</SelectItem>
                    {crews.filter(c => c.is_active !== false).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.crew_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}