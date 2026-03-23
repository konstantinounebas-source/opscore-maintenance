import React, { useState, useMemo, useCallback } from 'react';
import { EMPTY_FILTERS } from '@/components/planning/planningUtils';
import WeekPanelHeader from '@/components/planning/WeekPanelHeader';
import WeekPanelFilters from '@/components/planning/WeekPanelFilters';
import WeekPanelAssignments from '@/components/planning/WeekPanelAssignments';
import WeekPanelSummary from '@/components/planning/WeekPanelSummary';
import PlanningMap from '@/components/planning/PlanningMap';

export default function WeekPlanningPanel({
  week,
  allAssignments,
  assets,
  incidentsByAsset,
  workOrdersByAsset,
  onSelectAssignment,
  onOpenWeek,
  onDuplicate,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Get assignments for this week
  const weekAssignments = useMemo(
    () => allAssignments.filter(a => a.planning_week_id === week?.id),
    [allAssignments, week?.id]
  );

  // Create map of assets for lookup
  const assetsMap = useMemo(() => Object.fromEntries(assets.map(a => [a.id, a])), [assets]);

  // Filter assets based on week's assignments and filters
  const filteredAssets = useMemo(() => {
    const assignedIds = new Set(weekAssignments.map(a => a.asset_id));
    const assignmentByAssetId = Object.fromEntries(weekAssignments.map(a => [a.asset_id, a]));

    return assets.filter(a => {
      if (!assignedIds.has(a.id)) return false;

      const f = filters;
      const q = f.search?.toLowerCase();
      if (q && !a.asset_id?.toLowerCase().includes(q) && !a.location_address?.toLowerCase().includes(q)) {
        return false;
      }
      if (f.city && a.city !== f.city) return false;
      if (f.shelter_type && a.shelter_type !== f.shelter_type) return false;

      const asgn = assignmentByAssetId[a.id];
      if (f.assignment_status && asgn?.assignment_status !== f.assignment_status) return false;
      if (f.priority_bucket && asgn?.priority_bucket !== f.priority_bucket) return false;
      if (f.team_name && asgn?.team_name !== f.team_name) return false;

      return true;
    });
  }, [assets, weekAssignments, filters]);

  // Get filtered assignments
  const filteredAssignments = useMemo(() => {
    const ids = new Set(filteredAssets.map(a => a.id));
    return weekAssignments.filter(a => ids.has(a.asset_id));
  }, [weekAssignments, filteredAssets]);

  const handleSelectAsset = useCallback(
    (asset) => {
      const assignment = weekAssignments.find(a => a.asset_id === asset.id);
      if (assignment) {
        onSelectAssignment?.(assignment);
      }
    },
    [weekAssignments, onSelectAssignment]
  );

  if (!week) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden flex-1 min-w-0">
      <WeekPanelHeader week={week} onOpenWeek={onOpenWeek} onDuplicate={onDuplicate} />
      <WeekPanelFilters
        filters={filters}
        onChange={setFilters}
        assets={assets}
        assignments={weekAssignments}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <PlanningMap
            assets={filteredAssets}
            assignments={weekAssignments}
            selectedAssetId={null}
            onSelectAsset={handleSelectAsset}
          />
        </div>

        <WeekPanelAssignments
          assignments={filteredAssignments}
          assetsMap={assetsMap}
          onSelectAssignment={onSelectAssignment}
        />
      </div>

      <WeekPanelSummary assignments={filteredAssignments} />
    </div>
  );
}