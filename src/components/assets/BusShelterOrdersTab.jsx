import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, X, Upload, Pencil, ChevronLeft, ChevronRight } from "lucide-react";

const STAGE_COLORS = {
  planning:     "bg-slate-100 text-slate-700",
  ordered:      "bg-blue-100 text-blue-700",
  installation: "bg-amber-100 text-amber-700",
  installed:    "bg-green-100 text-green-700",
  maintenance:  "bg-purple-100 text-purple-700",
};

const CONDITION_LABELS = {
  none:             "None",
  sign_only:        "Sign Only",
  shelter_only:     "Shelter Only",
  sign_and_shelter: "Sign & Shelter",
  unknown:          "Unknown",
};

const PAGE_SIZES = [20, 40, 80, 100, "All"];

export default function BusShelterOrdersTab({ assets, onNewOrder, onImport, onEditOrder }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const orders = useMemo(() =>
    assets
      .filter(a => a.asset_source === "bus_shelter_order")
      .sort((a, b) => {
        if ((b.order_year || 0) !== (a.order_year || 0)) return (b.order_year || 0) - (a.order_year || 0);
        return (a.asset_code || "").localeCompare(b.asset_code || "");
      }),
    [assets]
  );

  const uniqueCities = [...new Set(orders.map(o => o.city).filter(Boolean))].sort();
  const uniqueYears = [...new Set(orders.map(o => o.order_year).filter(Boolean))].sort((a, b) => b - a);

  const filtered = useMemo(() => {
    setPage(1); // reset to page 1 whenever filters change
    return orders.filter(o => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches = [o.asset_code, o.location_address, o.municipality, o.city, o.ordered_shelter_type]
          .some(v => v && String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (filterStage !== "all" && o.asset_stage !== filterStage) return false;
      if (filterCity !== "all" && o.city !== filterCity) return false;
      if (filterYear !== "all" && String(o.order_year) !== filterYear) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, search, filterStage, filterCity, filterYear]);

  const totalRows = filtered.length;
  const effectivePageSize = pageSize === "All" ? totalRows : pageSize;
  const totalPages = pageSize === "All" ? 1 : Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const paginated = pageSize === "All" ? filtered : filtered.slice((page - 1) * effectivePageSize, page * effectivePageSize);

  const hasFilters = search || filterStage !== "all" || filterCity !== "all" || filterYear !== "all";

  const handlePageSizeChange = (val) => {
    setPageSize(val === "All" ? "All" : Number(val));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9 h-9 text-sm w-52 bg-slate-50 border-slate-200" />
          </div>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="installation">Installation</SelectItem>
              <SelectItem value="installed">Installed</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-9 text-sm w-32"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-9 text-sm w-28"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterStage("all"); setFilterCity("all"); setFilterYear("all"); }} className="h-9 gap-1.5 text-slate-500">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onImport}>
            <Upload className="w-3.5 h-3.5" /> Import from Excel
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={onNewOrder}>
            <Plus className="w-3.5 h-3.5" /> New Bus Shelter Order
          </Button>
        </div>
      </div>

      {/* Count row */}
      <p className="text-xs text-slate-500">
        {hasFilters ? `${totalRows} of ${orders.length} orders shown` : `${totalRows} orders`}
      </p>

      {/* Table with horizontal scroll */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Code</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Address</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Municipality</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">City</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Condition</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Bay</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ordered Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Installed Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Year</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Install Date</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Stage</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Notes</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-10 text-slate-400 text-sm">No bus shelter orders found.</td></tr>
              ) : paginated.map(o => (
                <tr
                  key={o.id}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/AssetDetail?id=${o.id}`)}
                >
                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{o.asset_code || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{o.location_address || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{o.municipality || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{o.city || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{CONDITION_LABELS[o.existing_condition] || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {o.has_bay ? (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${o.has_bay === "yes" ? "bg-green-100 text-green-700" : o.has_bay === "no" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                        {o.has_bay}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{o.ordered_shelter_type || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{o.installed_shelter_type || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{o.order_year || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{o.installation_date || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {o.asset_stage ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${STAGE_COLORS[o.asset_stage] || "bg-slate-100 text-slate-600"}`}>
                        {o.asset_stage}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate">{o.notes || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                      onClick={() => onEditOrder?.(o)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pageSize !== "All" && totalPages > 1 && (
          <div className="flex items-center gap-2">
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
    </div>
  );
}