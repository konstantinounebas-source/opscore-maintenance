import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function WorkOrders() {
  const [filterStatus, setFilterStatus] = useState("active");
  const { data: allWorkOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const ALLOWED_PREFIXES = ["CORR-", "MSAFE-", "INSP-"];
  const allFiltered = allWorkOrders.filter(w =>
    ALLOWED_PREFIXES.some(p => (w.work_order_id || "").startsWith(p)) ||
    ["make safe", "corrective", "inspection"].some(kw => (w.title || "").toLowerCase().includes(kw))
  );

  const workOrders = useMemo(() => {
    if (filterStatus === "active") {
      return allFiltered.filter(w => w.status !== "Completed" && w.status !== "Cancelled");
    }
    return allFiltered;
  }, [allFiltered, filterStatus]);

  const priorityBadge = (p) => {
    const map = { P1: "bg-red-100 text-red-700 border border-red-200", P2: "bg-amber-100 text-amber-700 border border-amber-200" };
    const label = p === "P1" || p === "P2" ? p : p === "Critical" || p === "High" ? "P1" : "P2";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[label] || map["P2"]}`}>{label}</span>;
  };

  const columns = [
    { key: "work_order_id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "related_asset_name", label: "Asset" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority) },
    { key: "assigned_to", label: "Assigned To" },
    { key: "due_date", label: "Due Date", render: (r) => { if (!r.due_date) return <span className="text-slate-400">—</span>; const [y,m,d] = r.due_date.split("-"); return <span>{d}/{m}/{y}</span>; } },
  ];

  return (
    <div>
      <TopHeader title="Work Orders" />
      <div className="p-6 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="all">All Work Orders</SelectItem>
              </SelectContent>
            </Select>
            {filterStatus !== "active" && (
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus("active")} className="h-9 gap-1.5 text-slate-500">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        <DataTable columns={columns} data={workOrders} searchPlaceholder="Search work orders..." />
      </div>
    </div>
  );
}