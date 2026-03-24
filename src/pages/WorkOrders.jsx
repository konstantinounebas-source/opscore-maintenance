import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";

export default function WorkOrders() {
  const { data: allWorkOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const ALLOWED_PREFIXES = ["CORR-", "MSAFE-", "INSP-"];
  const workOrders = allWorkOrders.filter(w =>
    ALLOWED_PREFIXES.some(p => (w.work_order_id || "").startsWith(p)) ||
    ["make safe", "corrective", "inspection"].some(kw => (w.title || "").toLowerCase().includes(kw))
  );

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
    { key: "due_date", label: "Due Date" },
  ];

  return (
    <div>
      <TopHeader title="Work Orders" />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center mb-6">
          <p className="text-sm text-slate-500">Work Orders module is coming soon. Structure is ready for expansion.</p>
        </div>
        <DataTable columns={columns} data={workOrders} searchPlaceholder="Search work orders..." />
      </div>
    </div>
  );
}