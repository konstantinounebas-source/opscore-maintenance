import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { EMPTY_FILTERS } from '@/components/planning/planningUtils';

export default function WeekPanelFilters({ filters, onChange, assets, assignments, onReset }) {
  const [localFilters, setLocalFilters] = useState(filters || EMPTY_FILTERS);

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

  const handleChange = (key, value) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onChange(updated);
  };

  const handleReset = () => {
    setLocalFilters(EMPTY_FILTERS);
    onReset?.();
  };

  const hasFilters = Object.values(localFilters).some(v => v !== undefined && v !== null && v !== '');

  return (
    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 space-y-2 text-xs">
      <Input
        placeholder="Search..."
        value={localFilters.search || ''}
        onChange={(e) => handleChange('search', e.target.value)}
        className="h-7 text-xs"
      />

      <div className="grid grid-cols-1 gap-1.5">
        <Select value={localFilters.city || ''} onValueChange={(v) => handleChange('city', v || null)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="City..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Cities</SelectItem>
            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={localFilters.shelter_type || ''} onValueChange={(v) => handleChange('shelter_type', v || null)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Shelter Type..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Types</SelectItem>
            {uniqueShelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={localFilters.assignment_status || ''} onValueChange={(v) => handleChange('assignment_status', v || null)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Status</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Deferred">Deferred</SelectItem>
          </SelectContent>
        </Select>

        <Select value={localFilters.priority_bucket || ''} onValueChange={(v) => handleChange('priority_bucket', v || null)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Priority..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Priorities</SelectItem>
            <SelectItem value="P1">P1 / Critical</SelectItem>
            <SelectItem value="P2">P2 / High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={localFilters.team_name || ''} onValueChange={(v) => handleChange('team_name', v || null)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Crew..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Crews</SelectItem>
            {uniqueCrews.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-full text-xs text-slate-600 hover:text-slate-700"
          onClick={handleReset}
        >
          <X className="w-3 h-3 mr-1" /> Clear Filters
        </Button>
      )}
    </div>
  );
}