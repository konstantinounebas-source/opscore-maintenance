import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  "Under Maintenance": "bg-amber-50 text-amber-700 border-amber-200",
  Decommissioned: "bg-red-50 text-red-700 border-red-200",
  Pending: "bg-blue-50 text-blue-700 border-blue-200",
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "On Hold": "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-600 border-slate-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Transit": "bg-blue-50 text-blue-700 border-blue-200",
  Returned: "bg-red-50 text-red-700 border-red-200",
};

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </Badge>
  );
}