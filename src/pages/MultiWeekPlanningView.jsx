import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WeekPlanningPanel from '@/components/planning/WeekPlanningPanel';
import { ChevronRight, ChevronLeft, Settings } from 'lucide-react';

export default function MultiWeekPlanningView() {
  const [baseWeekId, setBaseWeekId] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [selectedWeekIds, setSelectedWeekIds] = useState([]);

  // Data fetching
  const { data: weeks = [] } = useQuery({
    queryKey: ['planningWeeks'],
    queryFn: () => base44.entities.PlanningWeeks.list('-created_date'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Assets.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incidents.list(),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrders.list(),
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['planningAssignments'],
    queryFn: () => base44.entities.PlanningAssignments.list(),
  });

  // Set default base week
  useEffect(() => {
    if (weeks.length > 0 && !baseWeekId) {
      const active = weeks.find(w => w.is_active) || weeks[0];
      setBaseWeekId(active.id);
    }
  }, [weeks, baseWeekId]);

  // Compute 4 weeks to display
  const displayWeeks = useMemo(() => {
    if (manualMode) {
      return weeks.filter(w => selectedWeekIds.includes(w.id)).slice(0, 4);
    }

    // Auto-sequential mode
    if (!baseWeekId) return [];

    const baseIdx = weeks.findIndex(w => w.id === baseWeekId);
    if (baseIdx < 0) return [];

    return [baseIdx, baseIdx + 1, baseIdx + 2, baseIdx + 3]
      .map(i => weeks[i])
      .filter(Boolean);
  }, [weeks, baseWeekId, manualMode, selectedWeekIds]);

  // Derived data
  const incidentsByAsset = useMemo(() => {
    const m = {};
    incidents.forEach(i => {
      if (!m[i.related_asset_id]) m[i.related_asset_id] = [];
      m[i.related_asset_id].push(i);
    });
    return m;
  }, [incidents]);

  const workOrdersByAsset = useMemo(() => {
    const m = {};
    workOrders.forEach(w => {
      if (!m[w.related_asset_id]) m[w.related_asset_id] = [];
      m[w.related_asset_id].push(w);
    });
    return m;
  }, [workOrders]);

  const handlePrev = () => {
    if (!baseWeekId) return;
    const baseIdx = weeks.findIndex(w => w.id === baseWeekId);
    if (baseIdx > 0) setBaseWeekId(weeks[baseIdx - 1].id);
  };

  const handleNext = () => {
    if (!baseWeekId) return;
    const baseIdx = weeks.findIndex(w => w.id === baseWeekId);
    if (baseIdx < weeks.length - 1) setBaseWeekId(weeks[baseIdx + 1].id);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50">
      {/* Controls */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrev} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold text-slate-600">
            {displayWeeks.length > 0
              ? `${displayWeeks[0].week_code} → ${displayWeeks[displayWeeks.length - 1].week_code}`
              : 'No weeks selected'}
          </span>
          <Button size="sm" variant="outline" onClick={handleNext} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={manualMode ? 'default' : 'outline'}
            className="h-8 text-xs gap-1.5"
            onClick={() => setManualMode(!manualMode)}
          >
            <Settings className="w-3 h-3" /> {manualMode ? 'Auto' : 'Manual'}
          </Button>
        </div>

        {manualMode && (
          <Select
            value={selectedWeekIds[0] || ''}
            onValueChange={(v) => {
              const baseIdx = weeks.findIndex(w => w.id === v);
              const ids = weeks.slice(baseIdx, baseIdx + 4).map(w => w.id);
              setSelectedWeekIds(ids);
            }}
          >
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Select weeks..." />
            </SelectTrigger>
            <SelectContent>
              {weeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.week_code} — {w.week_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Week Panels Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-4 gap-3 h-full auto-rows-fr">
          {displayWeeks.map(week => (
            <WeekPlanningPanel
              key={week.id}
              week={week}
              allAssignments={allAssignments}
              assets={assets}
              incidentsByAsset={incidentsByAsset}
              workOrdersByAsset={workOrdersByAsset}
              onSelectAssignment={(assignment) => {
                // Handle assignment selection if needed
              }}
              onOpenWeek={() => {
                // Navigate to single week view if needed
              }}
            />
          ))}

          {/* Empty slots for visual balance */}
          {displayWeeks.length < 4 &&
            Array.from({ length: 4 - displayWeeks.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-white border border-dashed border-slate-200 rounded-lg flex items-center justify-center"
              >
                <p className="text-xs text-slate-400">No data</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}