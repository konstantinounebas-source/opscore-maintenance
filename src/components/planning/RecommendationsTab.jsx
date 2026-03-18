import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, XCircle, MinusCircle, Zap, RefreshCw, ExternalLink } from "lucide-react";
import { recommendationTypeColor, slaRiskColor } from "@/components/planning/slaUtils";
import { generateRecommendations, computeSchedulingScore, computeSLADueDate, computeSLARiskLevel } from "@/components/planning/slaUtils";

function RecStatusBadge({ status }) {
  const map = {
    Open: "bg-amber-100 text-amber-700 border-amber-200",
    Accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-100 text-red-500 border-red-200",
    Dismissed: "bg-slate-100 text-slate-400 border-slate-200",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${map[status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>{status}</span>;
}

export default function RecommendationsTab({
  selectedWeekId, weekAssignments, assetsMap, incidentsByAsset,
  crews, crewsMap, slaRules, recommendations, onNavigateToAsset
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("Open");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(null);

  const weekRecs = useMemo(() =>
    recommendations.filter(r => r.planning_week_id === selectedWeekId),
    [recommendations, selectedWeekId]
  );

  const filteredRecs = useMemo(() => {
    let r = weekRecs;
    if (filterType) r = r.filter(x => x.recommendation_type === filterType);
    if (filterStatus) r = r.filter(x => x.status === filterStatus);
    return r.sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
  }, [weekRecs, filterType, filterStatus]);

  const handleGenerate = async () => {
    if (!selectedWeekId) return;
    setGenerating(true);

    // Delete existing open recommendations for this week
    const existing = weekRecs.filter(r => r.status === "Open");
    await Promise.all(existing.map(r => base44.entities.SchedulingRecommendations.delete(r.id)));

    const newRecs = generateRecommendations({
      weekId: selectedWeekId,
      assignments: weekAssignments,
      assetsMap,
      incidentsByAsset,
      crewsMap,
      crewSchedules: [],
      slaRules,
    });

    if (newRecs.length > 0) {
      await Promise.all(newRecs.map(r => base44.entities.SchedulingRecommendations.create(r)));
    }

    queryClient.invalidateQueries({ queryKey: ["schedulingRecommendations"] });
    toast({ title: `Generated ${newRecs.length} recommendations` });
    setGenerating(false);
    setFilterStatus("Open");
  };

  const handleUpdateStatus = async (rec, status) => {
    setSaving(rec.id);
    await base44.entities.SchedulingRecommendations.update(rec.id, { status });
    queryClient.invalidateQueries({ queryKey: ["schedulingRecommendations"] });
    toast({ title: `Recommendation ${status.toLowerCase()}` });
    setSaving(null);
  };

  const handleAccept = async (rec) => {
    // Apply safe auto-actions
    if (rec.planning_assignment_id && rec.recommendation_type === "Priority Escalation" && rec.recommended_crew_id) {
      await base44.entities.PlanningAssignments.update(rec.planning_assignment_id, { crew_id: rec.recommended_crew_id });
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    }
    await handleUpdateStatus(rec, "Accepted");
  };

  const recTypes = [...new Set(weekRecs.map(r => r.recommendation_type))];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All statuses</SelectItem>
            {["Open", "Accepted", "Rejected", "Dismissed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All types</SelectItem>
            {recTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-slate-400">{weekRecs.filter(r => r.status === "Open").length} open</span>
          <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1" onClick={handleGenerate} disabled={generating || !selectedWeekId}>
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Recommendations list */}
      {filteredRecs.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          {weekRecs.length === 0
            ? "No recommendations yet. Click \"Run Analysis\" to generate."
            : "No recommendations match filters."}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecs.map(rec => {
            const asset = assetsMap[rec.asset_id] || {};
            const crew = rec.recommended_crew_id ? crewsMap[rec.recommended_crew_id] : null;
            return (
              <div key={rec.id} className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${recommendationTypeColor(rec.recommendation_type)}`}>
                        {rec.recommendation_type}
                      </span>
                      <RecStatusBadge status={rec.status} />
                      {rec.recommendation_score != null && (
                        <span className="text-xs text-slate-400 font-mono">Score: {rec.recommendation_score}</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {asset.asset_name || asset.asset_id || "—"}
                      {asset.city ? <span className="text-slate-400 font-normal"> · {asset.city}</span> : null}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{rec.recommendation_reason}</div>
                    {rec.suggested_action && (
                      <div className="text-xs text-indigo-600 mt-0.5">→ {rec.suggested_action}</div>
                    )}
                    {crew && <div className="text-xs text-slate-400 mt-0.5">Recommended crew: {crew.crew_name}</div>}
                  </div>
                  <button
                    onClick={() => onNavigateToAsset && onNavigateToAsset(rec.asset_id)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
                {rec.status === "Open" && (
                  <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      disabled={saving === rec.id} onClick={() => handleAccept(rec)}>
                      {saving === rec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                      disabled={saving === rec.id} onClick={() => handleUpdateStatus(rec, "Rejected")}>
                      <XCircle className="w-3 h-3" />
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-slate-400 hover:text-slate-600"
                      disabled={saving === rec.id} onClick={() => handleUpdateStatus(rec, "Dismissed")}>
                      <MinusCircle className="w-3 h-3" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}