import React, { useMemo } from "react";
import { computeSnapshot, computeChangeFlag, changeFlagStyle } from "./planningUtils";
import PlanningKPIBar from "./PlanningKPIBar";

// higherIsBetter=true → green when positive (e.g. Completed)
// higherIsBetter=false → red when positive (e.g. Deferred, Cancelled)
function DeltaRow({ label, a, b, higherIsBetter = true }) {
  const delta = (b ?? 0) - (a ?? 0);
  const positiveColor = higherIsBetter ? "text-emerald-600" : "text-red-500";
  const negativeColor = higherIsBetter ? "text-red-500" : "text-emerald-600";
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">{a ?? 0}</span>
        <span className="text-xs text-slate-400">→</span>
        <span className="text-xs text-slate-600">{b ?? 0}</span>
        <span className={`text-xs font-semibold w-12 text-right ${delta > 0 ? positiveColor : delta < 0 ? negativeColor : "text-slate-400"}`}>
          {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
        </span>
      </div>
    </div>
  );
}

export default function ComparisonPanel({
  weekA, weekB, allAssignments, assetsMap,
}) {
  const assignmentsA = useMemo(() => allAssignments.filter(a => a.planning_week_id === weekA?.id), [allAssignments, weekA]);
  const assignmentsB = useMemo(() => allAssignments.filter(a => a.planning_week_id === weekB?.id), [allAssignments, weekB]);

  const snapA = useMemo(() => weekA ? computeSnapshot(weekA.id, weekA.week_code, weekA.week_name, allAssignments) : null, [weekA, allAssignments]);
  const snapB = useMemo(() => weekB ? computeSnapshot(weekB.id, weekB.week_code, weekB.week_name, allAssignments) : null, [weekB, allAssignments]);

  // Build comparison rows from union of all asset IDs across both weeks
  const comparisonRows = useMemo(() => {
    const mapA = Object.fromEntries(assignmentsA.map(a => [a.asset_id, a]));
    const mapB = Object.fromEntries(assignmentsB.map(a => [a.asset_id, a]));
    const allIds = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    return [...allIds].map(assetId => {
      const asset = assetsMap[assetId] || {};
      const asgA = mapA[assetId] || null;
      const asgB = mapB[assetId] || null;
      const flag = computeChangeFlag(asgA, asgB);
      return { assetId, asset, asgA, asgB, flag };
    }).sort((a, b) => (a.asset?.asset_id || "").localeCompare(b.asset?.asset_id || ""));
  }, [assignmentsA, assignmentsB, assetsMap]);

  if (!weekA) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI summaries */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <PlanningKPIBar assignments={assignmentsA} label={`Week A: ${weekA.week_code} — ${weekA.week_name}`} />
        </div>
        {weekB && (
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <PlanningKPIBar assignments={assignmentsB} label={`Week B: ${weekB.week_code} — ${weekB.week_name}`} />
          </div>
        )}
      </div>

      {/* Delta summary */}
      {weekB && snapA && snapB && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Delta (A → B)</div>
          <DeltaRow label="Total Assigned"  a={snapA.total_assets_assigned} b={snapB.total_assets_assigned} higherIsBetter={true} />
          <DeltaRow label="Completed"       a={snapA.total_completed}       b={snapB.total_completed}       higherIsBetter={true} />
          <DeltaRow label="In Progress"     a={snapA.total_in_progress}     b={snapB.total_in_progress}     higherIsBetter={true} />
          <DeltaRow label="Deferred"        a={snapA.total_deferred}        b={snapB.total_deferred}        higherIsBetter={false} />
          <DeltaRow label="Cancelled"       a={snapA.total_cancelled}       b={snapB.total_cancelled}       higherIsBetter={false} />
          <DeltaRow label="P1/Critical"     a={(snapA.total_p1 + snapA.total_critical)} b={(snapB.total_p1 + snapB.total_critical)} higherIsBetter={false} />
          <DeltaRow label="P2/High"         a={(snapA.total_p2 + snapA.total_high)}     b={(snapB.total_p2 + snapB.total_high)}     higherIsBetter={false} />
        </div>
      )}

      {/* Comparison table */}
      {weekB && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Asset Comparison</span>
            <span className="text-xs text-slate-400">{comparisonRows.length} assets</span>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-xs min-w-[680px]">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">Asset ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">City</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">A Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">A Team</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">B Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">B Team</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map(r => (
                  <tr key={r.assetId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-700">{r.asset.asset_id || r.assetId.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-slate-800 max-w-[130px] truncate">{r.asset.asset_name || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{r.asset.city || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{r.asgA?.assignment_status || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{r.asgA?.team_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{r.asgB?.assignment_status || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{r.asgB?.team_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2">
                      {r.flag && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${changeFlagStyle(r.flag)}`}>
                          {r.flag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {comparisonRows.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">No assignments in either week.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!weekB && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg py-6 text-center text-slate-400 text-sm">
          Select Week B to see comparison
        </div>
      )}
    </div>
  );
}