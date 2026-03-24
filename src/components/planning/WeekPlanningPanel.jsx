import React, { useState, useMemo, useCallback, memo } from 'react';
import { EMPTY_FILTERS } from '@/components/planning/planningUtils';
import WeekPanelHeader from '@/components/planning/WeekPanelHeader';
import WeekPanelFilters from '@/components/planning/WeekPanelFilters';
import WeekPanelAssignments from '@/components/planning/WeekPanelAssignments';
import WeekPanelSummary from '@/components/planning/WeekPanelSummary';
import PlanningMap from '@/components/planning/PlanningMap';

// panelCount: total panels visible → drives compactness
const WeekPlanningPanel = memo(function WeekPlanningPanel({
  panelIndex,
  week,
  weeks = [],
  allAssignments,
  assets,
  panelCount = 1,
  onWeekChange,
  onOpenWeek,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const compact = panelCount >= 3;
  const superCompact = panelCount === 4;

  // Per-panel map heights based on panel count
  const mapHeightMap = { 1: 420, 2: 300, 3: 220, 4: 180 };
  const mapHeight = mapHeightMap[panelCount] || 180;

  const weekAssignments = useMemo(
    () => allAssignments.filter(a => a.planning_week_id === week?.id),
    [allAssignments, week?.id]
  );

  const assetsMap = useMemo(
    () => Object.fromEntries(assets.map(a => [a.id, a])),
    [assets]
  );

  const filteredAssets = useMemo(() => {
    if (!week) return [];
    const assignedIds = new Set(weekAssignments.map(a => a.asset_id));
    const assignmentByAssetId = Object.fromEntries(weekAssignments.map(a => [a.asset_id, a]));

    return assets.filter(a => {
      if (!assignedIds.has(a.id)) return false;
      const f = filters;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!a.asset_id?.toLowerCase().includes(q) && !a.location_address?.toLowerCase().includes(q)) return false;
      }
      if (f.city && a.city !== f.city) return false;
      if (f.shelter_type && a.shelter_type !== f.shelter_type) return false;
      const asgn = assignmentByAssetId[a.id];
      if (f.assignment_status && asgn?.assignment_status !== f.assignment_status) return false;
      if (f.priority_bucket && asgn?.priority_bucket !== f.priority_bucket) return false;
      if (f.team_name && asgn?.team_name !== f.team_name) return false;
      return true;
    });
  }, [assets, weekAssignments, filters, week]);

  const filteredAssignments = useMemo(() => {
    const ids = new Set(filteredAssets.map(a => a.id));
    return weekAssignments.filter(a => ids.has(a.asset_id));
  }, [weekAssignments, filteredAssets]);

  const handleSelectAsset = useCallback((asset) => {
    setSelectedAssetId(asset.id);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // Empty panel state
  if (!week) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg border-2 border-dashed border-slate-200 items-center justify-center">
        <p className="text-xs text-slate-400">No week selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      <WeekPanelHeader
        week={week}
        weeks={weeks}
        panelIndex={panelIndex}
        onWeekChange={onWeekChange}
        onOpenWeek={onOpenWeek}
        compact={compact}
      />

      <WeekPanelFilters
        filters={filters}
        onChange={setFilters}
        assets={assets}
        assignments={weekAssignments}
        onReset={handleReset}
        compact={compact}
      />

      {/* Map */}
      <div className="flex-shrink-0 border-b border-slate-200" style={{ height: mapHeight }}>
        <PlanningMap
          assets={filteredAssets}
          assignments={weekAssignments}
          selectedAssetId={selectedAssetId}
          onSelectAsset={handleSelectAsset}
        />
      </div>

      {/* Assignments list — grows to fill remaining space */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <WeekPanelAssignments
          assignments={filteredAssignments}
          assetsMap={assetsMap}
          onSelectAssignment={(a) => setSelectedAssetId(a.asset_id)}
          compact={compact}
        />
      </div>

      <WeekPanelSummary assignments={filteredAssignments} compact={superCompact} />
    </div>
  );
});

export default WeekPlanningPanel;