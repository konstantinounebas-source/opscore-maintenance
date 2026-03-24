import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AnalyticsFilters({ filters, onChange, assets, incidents }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));

  const cities = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const assetStatuses = [...new Set(assets.map(a => a.status).filter(Boolean))].sort();
  const incidentStatuses = ["Open", "In Progress", "On Hold", "Resolved", "Closed"];
  const priorities = ["Critical", "High", "Medium", "Low"];
  const caStatuses = ["Pending", "Approved", "Not Approved"];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Date From</Label>
        <Input type="date" value={filters.dateFrom} onChange={e => set("dateFrom", e.target.value)} className="h-8 text-xs w-36" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Date To</Label>
        <Input type="date" value={filters.dateTo} onChange={e => set("dateTo", e.target.value)} className="h-8 text-xs w-36" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">City</Label>
        <Select value={filters.city || "_all"} onValueChange={v => set("city", v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Cities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Cities</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Asset Status</Label>
        <Select value={filters.assetStatus || "_all"} onValueChange={v => set("assetStatus", v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            {assetStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Incident Status</Label>
        <Select value={filters.incidentStatus || "_all"} onValueChange={v => set("incidentStatus", v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            {incidentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Priority</Label>
        <Select value={filters.priority || "_all"} onValueChange={v => set("priority", v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Priorities</SelectItem>
            {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Warranty</Label>
        <Select value={filters.warrantyStatus || "_all"} onValueChange={v => set("warrantyStatus", v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            <SelectItem value="In Warranty">In Warranty</SelectItem>
            <SelectItem value="OWR">OWR (Out of Warranty)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">CA Status</Label>
        <Select value={filters.caStatus || "_all"} onValueChange={v => set("caStatus", v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            {caStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 pb-0.5">
        <Switch checked={filters.owrOnly} onCheckedChange={v => set("owrOnly", v)} id="owr-only" />
        <Label htmlFor="owr-only" className="text-xs text-slate-600 cursor-pointer">OWR Only</Label>
      </div>
      <div className="flex items-center gap-2 pb-0.5">
        <Switch checked={filters.fmpiOnly} onCheckedChange={v => set("fmpiOnly", v)} id="fmpi-only" />
        <Label htmlFor="fmpi-only" className="text-xs text-slate-600 cursor-pointer">FMPI Only</Label>
      </div>
    </div>
  );
}