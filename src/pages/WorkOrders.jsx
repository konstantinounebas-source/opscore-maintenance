import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";

export default function WorkOrders() {
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const columns = [
    { key: "work_order_id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "related_asset_name", label: "Asset" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", label: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
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