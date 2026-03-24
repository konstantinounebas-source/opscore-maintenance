import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import WeekPlanningPanel from '@/components/planning/WeekPlanningPanel';
import { LayoutGrid, Columns2, Square, Table2, ChevronLeft, ChevronRight } from 'lucide-react';

// Layout grid class per panel count
const GRID_CONFIG = {
  1: { grid: 'grid-cols-1', rows: 'grid-rows-1' },
  2: { grid: 'grid-cols-2', rows: 'grid-rows-1' },
  3: { grid: 'grid-cols-2', rows: 'grid-rows-2' }, // 3 panels = 2x2 with last spanning
  4: { grid: 'grid-cols-2', rows: 'grid-rows-2' },
};

const PANEL_BUTTONS = [
  { count: 1, label: '1', icon: Square, title: '1 Panel' },
  { count: 2, label: '2', icon: Columns2, title: '2 Panels' },
  { count: 3, label: '3', icon: Table2, title: '3 Panels' },
  { count: 4, label: '4', icon: LayoutGrid, title: '4 Panels' },
];

export default function MultiWeekPlanningView() {
  const [panelCount, setPanelCount] = useState(2);
  const [manualMode, setManualMode] = useState(false);
  // Per-panel selected week IDs — supports up to 4 independent slots
  const [panelWeekIds, setPanelWeekIds] = useState([null, null, null, null]);

  const { data: weeks = [] } = useQuery({
    queryKey: ['planningWeeks'],
    queryFn: () => base44.entities.PlanningWeeks.list('-created_date'),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Assets.list(),
  });
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['planningAssignments'],
    queryFn: () => base44.entities.PlanningAssignments.list(),
  });

  // On weeks load, auto-assign sequential weeks to panels
  useEffect(() => {
    if (weeks.length === 0) return;
    setPanelWeekIds(prev => {
      if (prev.some(id => id !== null)) return prev; // already set
      const active = weeks.find(w => w.is_active) || weeks[0];
      const baseIdx = weeks.findIndex(w => w.id === active.id);
      return [0, 1, 2, 3].map(i => weeks[baseIdx + i]?.id || null);
    });
  }, [weeks]);

  // Auto-sequential nav: shift base week forward/back
  const handleBaseShift = useCallback((dir) => {
    setPanelWeekIds(prev => {
      const firstId = prev[0];
      const firstIdx = weeks.findIndex(w => w.id === firstId);
      const newBase = firstIdx + dir;
      if (newBase < 0 || newBase >= weeks.length) return prev;
      return [0, 1, 2, 3].map(i => weeks[newBase + i]?.id || null);
    });
  }, [weeks]);

  // Manual per-panel week change
  const handlePanelWeekChange = useCallback((panelIdx, weekId) => {
    setPanelWeekIds(prev => {
      const next = [...prev];
      next[panelIdx] = weekId;
      return next;
    });
    if (!manualMode) setManualMode(true);
  }, [manualMode]);

  // When switching from manual back to auto, re-sequence
  const handleToggleMode = () => {
    if (manualMode) {
      // Reset to sequential from first panel's week
      const firstId = panelWeekIds[0];
      const baseIdx = weeks.findIndex(w => w.id === firstId);
      const base = baseIdx >= 0 ? baseIdx : 0;
      setPanelWeekIds([0, 1, 2, 3].map(i => weeks[base + i]?.id || null));
    }
    setManualMode(m => !m);
  };

  // When panel count changes, auto-fill new slots sequentially
  const handlePanelCountChange = (newCount) => {
    setPanelCount(newCount);
    if (!manualMode) {
      setPanelWeekIds(prev => {
        const firstId = prev[0];
        const baseIdx = weeks.findIndex(w => w.id === firstId);
        const base = baseIdx >= 0 ? baseIdx : 0;
        return [0, 1, 2, 3].map(i => weeks[base + i]?.id || null);
      });
    }
  };

  // Derive week objects for visible panels
  const weeksMap = useMemo(() => Object.fromEntries(weeks.map(w => [w.id, w])), [weeks]);
  const visiblePanelWeeks = panelWeekIds.slice(0, panelCount).map(id => weeksMap[id] || null);

  // Range label for header
  const rangeLabel = useMemo(() => {
    const valid = visiblePanelWeeks.filter(Boolean);
    if (valid.length === 0) return 'No weeks selected';
    if (valid.length === 1) return valid[0].week_code;
    return `${valid[0].week_code} → ${valid[valid.length - 1].week_code}`;
  }, [visiblePanelWeeks]);

  // Grid CSS based on panel count
  const getGridClass = () => {
    if (panelCount === 1) return 'grid grid-cols-1 h-full';
    if (panelCount === 2) return 'grid grid-cols-2 h-full gap-3';
    if (panelCount === 3) return 'grid grid-cols-2 gap-3 h-full';
    return 'grid grid-cols-2 grid-rows-2 gap-3 h-full';
  };

  // For 3-panel, the 3rd panel spans full width of second row
  const getPanelClass = (idx, count) => {
    if (count === 3 && idx === 2) return 'col-span-2';
    return '';
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        {/* Panel count selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {PANEL_BUTTONS.map(({ count, label, title }) => (
            <button
              key={count}
              onClick={() => handlePanelCountChange(count)}
              title={title}
              className={`w-8 h-7 rounded text-xs font-bold transition-all ${
                panelCount === count
                  ? 'bg-white shadow text-indigo-700 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => handleBaseShift(-1)} className="h-7 w-7 p-0" disabled={manualMode}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-semibold text-slate-600 px-2 min-w-[120px] text-center">{rangeLabel}</span>
          <Button size="sm" variant="outline" onClick={() => handleBaseShift(1)} className="h-7 w-7 p-0" disabled={manualMode}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mode toggle */}
        <button
          onClick={handleToggleMode}
          className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
            manualMode
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {manualMode ? '⚙ Manual' : '⚡ Auto-Seq'}
        </button>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>{panelCount} week{panelCount !== 1 ? 's' : ''} · {allAssignments.length} assignments total</span>
        </div>
      </div>

      {/* Panels grid */}
      <div className="flex-1 overflow-hidden p-3">
        <div className={getGridClass()}>
          {visiblePanelWeeks.map((week, idx) => (
            <div key={`panel-${idx}`} className={`min-h-0 overflow-hidden ${getPanelClass(idx, panelCount)}`}>
              <WeekPlanningPanel
                panelIndex={idx}
                week={week}
                weeks={weeks}
                allAssignments={allAssignments}
                assets={assets}
                panelCount={panelCount}
                onWeekChange={(weekId) => handlePanelWeekChange(idx, weekId)}
                onOpenWeek={null}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}