import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Pencil, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const STAGE_COLORS = {
  planning:     "bg-slate-100 text-slate-700",
  ordered:      "bg-blue-100 text-blue-700",
  installation: "bg-amber-100 text-amber-700",
  installed:    "bg-green-100 text-green-700",
  maintenance:  "bg-purple-100 text-purple-700",
};

const PAGE_SIZES = [10, 20, 40, 80, "All"];

export default function UnifiedAssetsTable({
  assets,
  incidents = [],
  workOrders = [],
  childAssets = [],
  onEdit,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterOrdered, setFilterOrdered] = useState("all");
  const [filterShelterType, setFilterShelterType] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOpenIncidents, setFilterOpenIncidents] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getOpenIncidents = (assetId) =>
    incidents.filter(i => i.related_asset_id === assetId && (i.status === "Open" || i.status === "In Progress")).length;
  const getOpenWOs = (assetId) =>
    workOrders.filter(w => w.related_asset_id === assetId && (w.status === "Open" || w.status === "In Progress")).length;
  const getChildCount = (assetId) =>
    childAssets.filter(c => c.parent_asset_id === assetId).length;

  const uniqueCities = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const uniquePhases = [...new Set(assets.map(a => a.phase).filter(Boolean))].sort();
  const uniqueStages = [...new Set(assets.map(a => a.asset_stage).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(assets.map(a => a.status).filter(Boolean))].sort();
  const uniqueShelterTypes = [...new Set(
    assets.flatMap(a => [a.shelter_type, a.ordered_shelter_type, a.installed_shelter_type]).filter(Boolean)
  )].sort();

  const filtered = useMemo(() => {
    setPage(1);
    return assets.filter(a => {
      if (filterCity !== "all" && a.city !== filterCity) return false;
      if (filterPhase !== "all" && a.phase !== filterPhase) return false;
      if (filterOrdered === "yes" && !a.order_year) return false;
      if (filterOrdered === "no" && a.order_year) return false;
      if (filterShelterType !== "all" && ![a.shelter_type, a.ordered_shelter_type, a.installed_shelter_type].includes(filterShelterType)) return false;
      if (filterStage !== "all" && a.asset_stage !== filterStage) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterOpenIncidents === "with" && getOpenIncidents(a.id) === 0) return false;
      if (filterOpenIncidents === "without" && getOpenIncidents(a.id) > 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches = [
          a.asset_id, a.active_shelter_id, a.asset_code, a.location_address,
          a.city, a.municipality, a.shelter_type, a.status,
          a.ordered_shelter_type, a.installed_shelter_type,
        ].some(v => v && String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      // Open incidents first, then by city, then by ID
      const aInc = getOpenIncidents(a.id);
      const bInc = getOpenIncidents(b.id);
      if (bInc !== aInc) return bInc - aInc;
      return (a.city || "").localeCompare(b.city || "");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, search, filterCity, filterPhase, filterStage, filterStatus, filterOrdered, filterShelterType, filterOpenIncidents, incidents, workOrders, childAssets]);

  const totalRows = filtered.length;
  const effectivePageSize = pageSize === "All" ? totalRows : pageSize;
  const totalPages = pageSize === "All" ? 1 : Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const paginated = pageSize === "All" ? filtered : filtered.slice((page - 1) * effectivePageSize, page * effectivePageSize);

  const hasFilters = search || filterCity !== "all" || filterPhase !== "all" || filterStage !== "all" || filterStatus !== "all" || filterOrdered !== "all" || filterShelterType !== "all" || filterOpenIncidents !== "all";

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, shelter, city, address..."
              className="pl-9 h-9 text-sm w-64 bg-slate-50 border-slate-200"
            />
          </div>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="h-9 text-sm w-44"><SelectValue placeholder="Phase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {uniquePhases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterOrdered} onValueChange={setFilterOrdered}>
            <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Ordered" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (Ordered)</SelectItem>
              <SelectItem value="yes">Ordered</SelectItem>
              <SelectItem value="no">Not Ordered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterShelterType} onValueChange={setFilterShelterType}>
            <SelectTrigger className="h-9 text-sm w-48"><SelectValue placeholder="Shelter Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shelter Types</SelectItem>
              {uniqueShelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-9 text-sm w-44"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {uniqueStages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterOpenIncidents} onValueChange={setFilterOpenIncidents}>
            <SelectTrigger className="h-9 text-sm w-48"><SelectValue placeholder="Incidents" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (Incidents)</SelectItem>
              <SelectItem value="with">With Open Incidents</SelectItem>
              <SelectItem value="without">No Open Incidents</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost" size="sm"
              onClick={() => { setSearch(""); setFilterCity("all"); setFilterPhase("all"); setFilterStage("all"); setFilterStatus("all"); setFilterOrdered("all"); setFilterShelterType("all"); setFilterOpenIncidents("all"); }}
              className="h-9 gap-1.5 text-slate-500"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(v === "All" ? "All" : Number(v)); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && <span className="text-xs text-slate-500">{totalRows} of {assets.length} assets shown</span>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Shelter ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Address</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">City</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Shelter Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Phase</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Order Year</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Incidents</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">WOs</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Childs</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-400 text-sm">No assets found.</td></tr>
              ) : paginated.map(a => {
                 const openInc = getOpenIncidents(a.id);
                 const openWOs = getOpenWOs(a.id);
                 const childCount = getChildCount(a.id);
                 return (
                   <tr
                     key={a.id}
                     className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${openInc > 0 ? "bg-red-50/40" : ""}`}
                     onClick={() => navigate(`/AssetDetail?id=${a.id}`)}
                   >
                    <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      {a.active_shelter_id || a.asset_code || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{a.location_address || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{a.city || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {a.shelter_type || a.ordered_shelter_type || a.installed_shelter_type || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {a.phase ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{a.phase}</span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {a.status ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-700">{a.status}</span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {a.order_year ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">{a.order_year}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {openInc > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> {openInc}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {openWOs > 0 ? (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{openWOs}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {childCount > 0 ? (
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{childCount}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                        onClick={() => onEdit?.(a)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pageSize !== "All" && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-slate-500">
            {(page - 1) * effectivePageSize + 1}–{Math.min(page * effectivePageSize, totalRows)} of {totalRows}
          </span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}