import React from "react";
import { format } from "date-fns";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function exportCSV(records, type) {
  let headers = [];
  let rows = [];
  if (type === "incidents") {
    headers = ["ID", "Title", "Status", "Priority", "Reported Date", "OWR", "CA Status", "Municipality"];
    rows = records.map(r => [r.incident_id, r.title, r.status, r.priority, r.reported_date, r.out_of_warranty, r.ca_status, r.municipality]);
  } else if (type === "assets") {
    headers = ["Asset ID", "Status", "City", "Municipality", "Installation Date", "Shelter Type"];
    rows = records.map(r => [r.asset_id, r.status, r.city, r.municipality, r.installation_date, r.shelter_type]);
  } else if (type === "workorders") {
    headers = ["WO ID", "Title", "Status", "Priority", "Assigned To", "Due Date"];
    rows = records.map(r => [r.work_order_id, r.title, r.status, r.priority, r.assigned_to, r.due_date]);
  }
  const csv = [headers, ...rows].map(row => row.map(v => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DrillDownModal({ title, records = [], type, onClose }) {
  const cols = type === "incidents"
    ? ["incident_id", "title", "status", "priority", "reported_date", "out_of_warranty", "ca_status", "municipality"]
    : type === "assets"
    ? ["asset_id", "status", "city", "municipality", "installation_date", "shelter_type"]
    : ["work_order_id", "title", "status", "priority", "assigned_to", "due_date"];

  const labels = type === "incidents"
    ? ["ID", "Title", "Status", "Priority", "Reported", "OWR", "CA Status", "Municipality"]
    : type === "assets"
    ? ["Asset ID", "Status", "City", "Municipality", "Install Date", "Type"]
    : ["WO ID", "Title", "Status", "Priority", "Assigned To", "Due Date"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{records.length} record{records.length !== 1 ? "s" : ""} — source data</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(records, type)}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {records.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No records to display</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  {labels.map((l, i) => <th key={i} className="px-3 py-2 text-left font-semibold">{l}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {cols.map((c, j) => (
                      <td key={j} className="px-3 py-2 text-slate-700">
                        {c.includes("date") && r[c] ? format(new Date(r[c]), "dd MMM yyyy") : (r[c] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}