import React, { useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, X } from 'lucide-react';
import { EMPTY_FILTERS } from '@/components/planning/planningUtils';

export default function WeekPanelFilters({ filters, onChange, assets, assignments, onReset, compact = false }) {
  const debounceRef = useRef(null);

  const uniqueCities = useMemo(() => {
    const cities = new Set(assets.map(a => a.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [assets]);

  const uniqueShelterTypes = useMemo(() => {
    const types = new Set(assets.map(a => a.shelter_type).filter(Boolean));
    return Array.from(types).sort();
  }, [assets]);

  const uniqueCrews = useMemo(() => {
    const crews = new Set(assignments.map(a => a.team_name).filter(Boolean));
    return Array.from(crews).sort();
  }, [assignments]);

  const handleChange = useCallback((key, value) => {
    const updated = { ...filters, [key]: value || null };
    onChange(updated);
  }, [filters, onChange]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleChange('search', val), 200);
  };

  const hasFilters = Object.entries(filters).some(([k, v]) => k !== 'search' && v);
  const hasSearch = !!filters.search;
  const hasAny = hasFilters || hasSearch;

  // COMPACT MODE: single row with dropdowns collapsed into select chips
  if (compact) {
    return (
      <div className="px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5 flex-wrap">
        <Input
          defaultValue={filters.search || ''}
          onChange={handleSearchChange}
          placeholder="Search..."
          className="h-6 text-[11px] w-24 px-2"
        />
        <Select value={filters.city || ''} onValueChange={v => handleChange('city', v)}>
          <SelectTrigger className="h-6 text-[11px] w-20 px-1.5 border-slate-200">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All</SelectItem>
            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.assignment_status || ''} onValueChange={v => handleChange('assignment_status', v)}>
          <SelectTrigger className="h-6 text-[11px] w-20 px-1.5 border-slate-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Deferred">Deferred</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority_bucket || ''} onValueChange={v => handleChange('priority_bucket', v)}>
          <SelectTrigger className="h-6 text-[11px] w-16 px-1.5 border-slate-200">
            <SelectValue placeholder="Pri." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All</SelectItem>
            <SelectItem value="P1">P1</SelectItem>
            <SelectItem value="P2">P2</SelectItem>
            <SelectItem value="Medium">Med</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        {hasAny && (
          <button onClick={onReset} className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 transition-colors" title="Clear filters">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // FULL MODE (1-panel or 2-panel)
  return (
    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 space-y-2">
      <div className="flex items-center gap-1.5">
        <SlidersHorizontal className="w-3 h-3 text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Filters</span>
        {hasAny && (
          <button onClick={onReset} className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      <Input
        defaultValue={filters.search || ''}
        onChange={handleSearchChange}
        placeholder="Search asset ID, address..."
        className="h-7 text-xs"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <Select value={filters.city || ''} onValueChange={v => handleChange('city', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="City..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Cities</SelectItem>
            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.shelter_type || ''} onValueChange={v => handleChange('shelter_type', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Shelter..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Types</SelectItem>
            {uniqueShelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.assignment_status || ''} onValueChange={v => handleChange('assignment_status', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Status</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Deferred">Deferred</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority_bucket || ''} onValueChange={v => handleChange('priority_bucket', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Priority..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Priorities</SelectItem>
            <SelectItem value="P1">P1 / Critical</SelectItem>
            <SelectItem value="P2">P2 / High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.team_name || ''} onValueChange={v => handleChange('team_name', v)} className="col-span-2">
          <SelectTrigger className="h-7 text-xs col-span-2"><SelectValue placeholder="Crew..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Crews</SelectItem>
            {uniqueCrews.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}