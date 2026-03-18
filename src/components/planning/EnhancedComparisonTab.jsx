import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Users, CheckCircle2, Clock } from "lucide-react";
import PlanningKPIBar from "@/components/planning/PlanningKPIBar";
import { computeSnapshot } from "@/components/planning/planningUtils";

function DeltaRow({ label, a, b, higherIsBetter = true }) {
  const delta = (b ?? 0) - (a ?? 0);
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const isGood = (isPositive && higherIsBetter) || (!isPositive && !higherIsBetter && !isNeutral);
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500 font-mono w-8 text-right">{a ?? "—"}</span>
        <span className="text-slate-400">→</span>
        <span className="text-slate-500 font-mono w-8 text-right">{b ?? "—"}</span>
        <span className={`font-mono w-10 text-right font-semibold ${isNeutral ? "text-slate-400" : isGood ? "text-emerald-600" : "text-red-500"}`}>
          {isNeutral ? "=" : `${isPositive ? "+" : ""}${delta}`}
        </span>
      </div>
    </div>
  );
}

function CrewWorkloadCard({ crew, assignments, weekLabel }) {
  const crewAssignments = assignments.filter(a => a.crew_id === crew.id);
  const capacity = crew.capacity_per_week || 0;
  const pct = capacity > 0 ? Math.round((crewAssignments.length / capacity) * 100) : null;
  const overloaded = capacity > 0 && crewAssignments.length > capacity;

  return (
    <div className="border border-slate-200 rounded p-2 bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crew.color_code || "#94a3b8" }} />
          <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">{crew.crew_name}</span>
        </div>
        {overloaded && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
      </div>
      <div className="text-lg font-bold text-slate-800">{crewAssignments.length}</div>
      <div className="text-xs text-slate-400">tasks {weekLabel}</div>
      {pct != null && (
        <div className="mt-1 w-full bg-slate-100 rounded-full h-1">
          <div className={`h-1 rounded-full ${overloaded ? "bg-orange-400" : "bg-emerald-400"}`}
            style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function EnhancedComparisonTab({
  weekA, weekB, allAssignments, assetsMap, crews, recommendations,
  compWeekId, setCompWeekId, weeks
}) {
  const assignmentsA = useMemo(() =>
    weekA ? allAssignments.filter(a => a.planning_week_id === weekA.id) : [],
    [weekA, allAssignments]
  );
  const assignmentsB = useMemo(() =>
    weekB ? allAssignments.filter(a => a.planning_week_id === weekB.id) : [],
    [weekB, allAssignments]
  );

  const snapshotA = useMemo(() =>
    weekA ? computeSnapshot(weekA.id, weekA.week_code, weekA.week_name, allAssignments) : null,
    [weekA, allAssignments]
  );
  const snapshotB = useMemo(() =>
    weekB ? computeSnapshot(weekB.id, weekB.week_code, weekB.week_name, allAssignments) : null,
    [weekB, allAssignments]
  );

  // SLA metrics
  const slaRiskA = useMemo(() => ({
    critical: assignmentsA.filter(a => a.sla_risk_level === "Critical").length,
    high: assignmentsA.filter(a => a.sla_risk_level === "High").length,
    unassignedP1P2: assignmentsA.filter(a => !a.crew_id && ["P1", "P2"].includes(a.priority_bucket)).length,
  }), [assignmentsA]);

  const slaRiskB = useMemo(() => ({
    critical: assignmentsB.filter(a => a.sla_risk_level === "Critical").length,
    high: assignmentsB.filter(a => a.sla_risk_level === "High").length,
    unassignedP1P2: assignmentsB.filter(a => !a.crew_id && ["P1", "P2"].includes(a.priority_bucket)).length,
  }), [assignmentsB]);

  const openRecsA = useMemo(() =>
    weekA ? recommendations.filter(r => r.planning_week_id === weekA.id && r.status === "Open").length : 0,
    [weekA, recommendations]
  );
  const openRecsB = useMemo(() =>
    weekB ? recommendations.filter(r => r.planning_week_id === weekB.id && r.status === "Open").length : 0,
    [weekB, recommendations]
  );

  const activeCrew = useMemo(() => crews.filter(c => c.is_active !== false), [crews]);

  return (
    <div className="space-y-4">
      {/* Week B selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold">Compare Week B:</span>
        <Select value={compWeekId || "none"} onValueChange={v => setCompWeekId(v === "none" ? null : v)}>
          <SelectTrigger className="h-7 text-xs w-56 border-slate-200"><SelectValue placeholder="Select week B" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {weeks.filter(w => w.id !== weekA?.id).map(w => (
              <SelectItem key={w.id} value={w.id}><span className="font-mono text-xs">{w.week_code}</span> {w.week_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!weekB ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          Select Week B to compare
        </div>
      ) : (
        <>
          {/* KPI side-by-side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">{weekA?.week_code} — A</div>
              <PlanningKPIBar assignments={assignmentsA} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">{weekB?.week_code} — B</div>
              <PlanningKPIBar assignments={assignmentsB} />
            </div>
          </div>

          {/* Assignment delta */}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2">Assignment Delta (A → B)</div>
            <DeltaRow label="Total Assigned" a={snapshotA?.total_assets_assigned} b={snapshotB?.total_assets_assigned} />
            <DeltaRow label="Completed"      a={snapshotA?.total_completed}       b={snapshotB?.total_completed} />
            <DeltaRow label="In Progress"    a={snapshotA?.total_in_progress}     b={snapshotB?.total_in_progress} />
            <DeltaRow label="Planned"        a={snapshotA?.total_planned}         b={snapshotB?.total_planned} />
            <DeltaRow label="Deferred"       a={snapshotA?.total_deferred}        b={snapshotB?.total_deferred}   higherIsBetter={false} />
            <DeltaRow label="Cancelled"      a={snapshotA?.total_cancelled}       b={snapshotB?.total_cancelled}  higherIsBetter={false} />
          </div>

          {/* SLA + Recommendations delta */}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2">SLA & Risk Delta (A → B)</div>
            <DeltaRow label="Critical SLA"          a={slaRiskA.critical}      b={slaRiskB.critical}      higherIsBetter={false} />
            <DeltaRow label="High SLA"              a={slaRiskA.high}          b={slaRiskB.high}          higherIsBetter={false} />
            <DeltaRow label="Unassigned P1/P2"      a={slaRiskA.unassignedP1P2} b={slaRiskB.unassignedP1P2} higherIsBetter={false} />
            <DeltaRow label="Open Recommendations"  a={openRecsA}              b={openRecsB}              higherIsBetter={false} />
          </div>

          {/* Crew workload comparison */}
          {activeCrew.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Crew Workload Comparison
              </div>
              <div className="space-y-2">
                {activeCrew.map(crew => (
                  <div key={crew.id} className="grid grid-cols-2 gap-2">
                    <CrewWorkloadCard crew={crew} assignments={assignmentsA} weekLabel="(A)" />
                    <CrewWorkloadCard crew={crew} assignments={assignmentsB} weekLabel="(B)" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}