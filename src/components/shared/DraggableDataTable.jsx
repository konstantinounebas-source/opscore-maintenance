import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, GripVertical, RotateCcw } from "lucide-react";

/**
 * DraggableDataTable — same as DataTable but with drag-and-drop column reordering.
 * Column order is persisted in localStorage under the given `storageKey`.
 * All sorting, filtering, and pagination logic is untouched.
 */
export default function DraggableDataTable({
  columns,
  data,
  onRowClick,
  searchPlaceholder = "Search...",
  pageSize = 20,
  hideSearch = false,
  storageKey = "draggable_table_columns",
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // ── Column order (keys only) ───────────────────────────────────────────────
  const defaultOrder = columns.map(c => c.key);

  const [colOrder, setColOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate: keep only keys that still exist in columns, append any new ones
        const valid = parsed.filter(k => defaultOrder.includes(k));
        const added = defaultOrder.filter(k => !valid.includes(k));
        return [...valid, ...added];
      }
    } catch {}
    return defaultOrder;
  });

  // Persist whenever order changes
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(colOrder)); } catch {}
  }, [colOrder, storageKey]);

  // Ordered column definitions (maintains all render/accessor fns)
  const orderedColumns = useMemo(
    () => colOrder.map(k => columns.find(c => c.key === k)).filter(Boolean),
    [colOrder, columns]
  );

  const resetOrder = () => setColOrder(defaultOrder);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const dragSrcIdx = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const onDragStart = useCallback((e, idx) => {
    dragSrcIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", idx);
  }, []);

  const onDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  }, []);

  const onDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    const srcIdx = dragSrcIdx.current;
    if (srcIdx === null || srcIdx === dropIdx) { setDragOverIdx(null); return; }
    setColOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  }, []);

  const onDragEnd = useCallback(() => {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  }, []);

  // ── Filtering & sorting (unchanged logic) ─────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor ? col.accessor(row) : row[col.key];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const aVal = col?.accessor ? col.accessor(a) : a[sortKey];
      const bVal = col?.accessor ? col.accessor(b) : b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = currentPageSize === 0 ? 1 : Math.ceil(sorted.length / currentPageSize);
  const paged = currentPageSize === 0 ? sorted : sorted.slice(page * currentPageSize, (page + 1) * currentPageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          {!hideSearch && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500 gap-1.5 hover:text-slate-700 shrink-0"
            onClick={resetOrder}
            title="Reset column order"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset columns
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show</span>
          <Select value={String(currentPageSize)} onValueChange={(val) => { setCurrentPageSize(parseInt(val)); setPage(0); }}>
            <SelectTrigger className="w-20 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="0">All</SelectItem>
            </SelectContent>
          </Select>
          <span>items</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              {orderedColumns.map((col, idx) => (
                <TableHead
                  key={col.key}
                  draggable
                  onDragStart={e => onDragStart(e, idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={e => onDrop(e, idx)}
                  onDragEnd={onDragEnd}
                  className={`text-xs font-semibold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap transition-colors group
                    ${dragOverIdx === idx ? "bg-indigo-50 border-l-2 border-indigo-400" : ""}
                  `}
                >
                  <div className="flex items-center gap-1">
                    {/* Drag handle — visible on hover only */}
                    <span
                      className="opacity-0 group-hover:opacity-60 cursor-grab active:cursor-grabbing transition-opacity text-slate-400 shrink-0"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    {/* Sort trigger (click on label area only) */}
                    <span
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? "opacity-80 text-indigo-500" : "opacity-30"}`} />
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={orderedColumns.length} className="text-center text-slate-400 py-12 text-sm">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, idx) => (
                <TableRow
                  key={row.id || idx}
                  className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {orderedColumns.map(col => (
                    <TableCell key={col.key} className="text-sm text-slate-700 whitespace-nowrap">
                      {col.render ? col.render(row) : (col.accessor ? col.accessor(row) : row[col.key]) || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && currentPageSize !== 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span>Showing {page * currentPageSize + 1}–{Math.min((page + 1) * currentPageSize, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}