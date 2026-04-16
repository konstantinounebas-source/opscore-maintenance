import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import DraggableDataTable from "@/components/shared/DraggableDataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Incidents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterWO, setFilterWO] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [filterShelterType, setFilterShelterType] = useState("all");
  const [filterReportingMethod, setFilterReportingMethod] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const createMutation = useMutation({
    mutationFn: async ({ data, pendingFiles }) => {
      const inc = await base44.entities.Incidents.create(data);
      const user = await base44.auth.me();
      await base44.entities.IncidentAuditTrail.create({ incident_id: inc.id, action: "Incident Created", details: `Incident ${data.incident_id} created`, user: user?.email });
      if (pendingFiles?.length > 0) {
        for (const file of pendingFiles) {
          await base44.entities.IncidentAttachments.create({
            incident_id: inc.id,
            file_name: file.name,
            file_url: file.url,
            file_type: file.type,
            uploaded_by: user?.email,
          });
        }
      }
      return inc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setFormOpen(false);
      toast({ title: "Incident created" });
    },
  });

  const exportCSV = () => {
    const headers = ["Incident ID", "Title", "Asset", "Status", "Priority", "Category", "Reported Date", "Assigned To"];
    const rows = incidents.map(i => [i.incident_id, i.title, i.related_asset_name, i.status, i.priority, i.category, i.reported_date, i.assigned_to]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "incidents_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueProvinces = [...new Set(incidents.map(i => i.province).filter(Boolean))].sort();
  const uniqueShelterTypes = [...new Set(incidents.map(i => i.shelter_type).filter(Boolean))].sort();
  const uniqueReportingMethods = [...new Set(incidents.map(i => i.incident_reporting_method).filter(Boolean))].sort();
  const uniqueSources = [...new Set(incidents.map(i => i.incident_source).filter(Boolean))].sort();

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const hasWO = workOrders.some(wo => (wo.incident_id === i.id || wo.incident_id === i.incident_id) && /corrective/i.test(wo.title || ""));
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterPriority !== "all" && i.initial_priority !== filterPriority) return false;
      if (filterWO === "yes" && !hasWO) return false;
      if (filterWO === "no" && hasWO) return false;
      if (filterProvince !== "all" && i.province !== filterProvince) return false;
      if (filterShelterType !== "all" && i.shelter_type !== filterShelterType) return false;
      if (filterReportingMethod !== "all" && i.incident_reporting_method !== filterReportingMethod) return false;
      if (filterSource !== "all" && i.incident_source !== filterSource) return false;
      return true;
    });
  }, [incidents, workOrders, filterStatus, filterPriority, filterWO, filterProvince, filterShelterType, filterReportingMethod, filterSource]);

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterWO !== "all" ||
    filterProvince !== "all" || filterShelterType !== "all" || filterReportingMethod !== "all" || filterSource !== "all";

  const clearFilters = () => {
    setFilterStatus("all"); setFilterPriority("all"); setFilterWO("all");
    setFilterProvince("all"); setFilterShelterType("all"); setFilterReportingMethod("all"); setFilterSource("all");
  };

  const columns = [
    { key: "incident_id", label: "ID" },
    {
      key: "related_asset_name",
      label: "Related Asset",
      render: (r) => r.related_asset_name ? (
        <span className="font-medium text-slate-700">{r.related_asset_name}</span>
      ) : <span className="text-slate-400">—</span>
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "initial_priority",
      label: "Priority",
      render: (r) => r.initial_priority ? (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${r.initial_priority === "P1" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
          {r.initial_priority}
        </span>
      ) : <span className="text-slate-400">—</span>
    },
    {
      key: "subsystems",
      label: "Επηρεαζόμενα Υποσυστήματα",
      accessor: (r) => {
        const parts = [];
        if (r.subsystem_structural_selected) parts.push(`Δομικό${r.subsystem_structural_issue ? `: ${r.subsystem_structural_issue}` : ""}`);
        if (r.subsystem_electrical_selected) parts.push(`Ηλεκτρικό${r.subsystem_electrical_issue ? `: ${r.subsystem_electrical_issue}` : ""}`);
        if (r.subsystem_electronic_selected) parts.push(`Ηλεκτρονικό${r.subsystem_electronic_issue ? `: ${r.subsystem_electronic_issue}` : ""}`);
        if (r.subsystem_other_selected) parts.push(`Άλλο${r.subsystem_other_issue ? `: ${r.subsystem_other_issue}` : ""}`);
        return parts.join(", ");
      },
      render: (r) => {
        const parts = [];
        if (r.subsystem_structural_selected) parts.push(`Δομικό${r.subsystem_structural_issue ? `: ${r.subsystem_structural_issue}` : ""}`);
        if (r.subsystem_electrical_selected) parts.push(`Ηλεκτρικό${r.subsystem_electrical_issue ? `: ${r.subsystem_electrical_issue}` : ""}`);
        if (r.subsystem_electronic_selected) parts.push(`Ηλεκτρονικό${r.subsystem_electronic_issue ? `: ${r.subsystem_electronic_issue}` : ""}`);
        if (r.subsystem_other_selected) parts.push(`Άλλο${r.subsystem_other_issue ? `: ${r.subsystem_other_issue}` : ""}`);
        return parts.length ? (
          <div className="flex flex-wrap gap-1">
            {parts.map((p, i) => <span key={i} className="inline-block bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5 rounded">{p}</span>)}
          </div>
        ) : <span className="text-slate-400">—</span>;
      }
    },
    {
      key: "damage_description",
      label: "Περιγραφή Βλάβης / Ζημιάς",
      render: (r) => r.damage_description ? (
        <span className="text-sm text-slate-700 line-clamp-2">{r.damage_description}</span>
      ) : <span className="text-slate-400">—</span>
    },
    {
      key: "has_wo",
      label: "WO",
      accessor: (r) => workOrders.some(wo => (wo.incident_id === r.id || wo.incident_id === r.incident_id) && /corrective/i.test(wo.title || "")) ? "Yes" : "No",
      render: (r) => {
        const hasWO = workOrders.some(wo => (wo.incident_id === r.id || wo.incident_id === r.incident_id) && /corrective/i.test(wo.title || ""));
        return hasWO ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">No</span>
        );
      }
    },
    {
      key: "ca_status",
      label: "CA Status",
      render: (r) => {
        const s = r.ca_status || "Pending";
        const styles = {
          Pending: "bg-amber-100 text-amber-700",
          Approved: "bg-green-100 text-green-700",
          "Not Approved": "bg-red-100 text-red-700",
        };
        return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[s] || "bg-slate-100 text-slate-500"}`}>{s}</span>;
      }
    },
    {
      key: "reported_date",
      label: "Reported Date and Time",
      render: (r) => {
        if (!r.reported_date) return <span className="text-slate-400">—</span>;
        const [y, m, d] = r.reported_date.split("-");
        const formatted = `${d}/${m}/${y}`;
        const time = r.detection_time ? ` ${r.detection_time}` : "";
        return <span className="text-sm text-slate-700">{formatted}{time}</span>;
      }
    },
  ];

  return (
    <div>
      <TopHeader
        title="Incidents"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => setFormOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Create Incident
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Open","In Progress","On Hold","Resolved","Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-9 text-sm w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="P1">P1 (Χαμηλή)</SelectItem>
                <SelectItem value="P2">P2 (Υψηλή)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterWO} onValueChange={setFilterWO}>
              <SelectTrigger className="h-9 text-sm w-32"><SelectValue placeholder="Work Order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (WO)</SelectItem>
                <SelectItem value="yes">Has WO</SelectItem>
                <SelectItem value="no">No WO</SelectItem>
              </SelectContent>
            </Select>
            {uniqueProvinces.length > 0 && (
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Province" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Provinces</SelectItem>
                  {uniqueProvinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {uniqueShelterTypes.length > 0 && (
              <Select value={filterShelterType} onValueChange={setFilterShelterType}>
                <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Shelter Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shelter Types</SelectItem>
                  {uniqueShelterTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {uniqueReportingMethods.length > 0 && (
              <Select value={filterReportingMethod} onValueChange={setFilterReportingMethod}>
                <SelectTrigger className="h-9 text-sm w-44"><SelectValue placeholder="Reporting Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {uniqueReportingMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {uniqueSources.length > 0 && (
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-slate-500">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="text-xs text-slate-500 mt-2">{filteredIncidents.length} of {incidents.length} incidents shown</p>
          )}
        </div>

        <DraggableDataTable
          columns={columns}
          data={filteredIncidents}
          onRowClick={(row) => navigate(`/IncidentDetail?id=${row.id}`)}
          searchPlaceholder="Search incidents..."
          storageKey="incidents_table_columns_order"
        />
      </div>
      <IncidentFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={(data, pendingFiles) => createMutation.mutate({ data, pendingFiles })} />
    </div>
  );
}