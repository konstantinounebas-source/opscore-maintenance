import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import DraggableDataTable from "@/components/shared/DraggableDataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Incidents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterShelterType, setFilterShelterType] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterWO, setFilterWO] = useState("all");
  const [filterReportedDate, setFilterReportedDate] = useState("");

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

  // Unique filter options derived from data
  const uniqueStatuses = [...new Set(incidents.map(i => i.status).filter(Boolean))].sort();
  const uniqueShelterTypes = [...new Set(incidents.map(i => i.shelter_type).filter(Boolean))].sort();
  const uniqueCities = [...new Set(incidents.map(i => i.province).filter(Boolean))].sort();

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const hasWO = workOrders.some(wo => wo.incident_id === i.id || wo.incident_id === i.incident_id);

      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const matches = [i.incident_id, i.title, i.related_asset_name, i.active_shelter_id, i.province, i.municipality]
          .some(v => v && String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterPriority !== "all" && i.initial_priority !== filterPriority) return false;
      if (filterShelterType !== "all" && i.shelter_type !== filterShelterType) return false;
      if (filterCity !== "all" && i.province !== filterCity) return false;
      if (filterWO === "with" && !hasWO) return false;
      if (filterWO === "without" && hasWO) return false;
      if (filterReportedDate && i.reported_date !== filterReportedDate) return false;
      return true;
    });
  }, [incidents, workOrders, searchText, filterStatus, filterPriority, filterShelterType, filterCity, filterWO, filterReportedDate]);

  const hasActiveFilters = searchText || filterStatus !== "all" || filterPriority !== "all" ||
    filterShelterType !== "all" || filterCity !== "all" || filterWO !== "all" || filterReportedDate;

  const clearFilters = () => {
    setSearchText(""); setFilterStatus("all"); setFilterPriority("all");
    setFilterShelterType("all"); setFilterCity("all"); setFilterWO("all"); setFilterReportedDate("");
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
      render: (r) => {
        const hasWO = workOrders.some(wo => wo.incident_id === r.id || wo.incident_id === r.incident_id);
        return hasWO ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">No</span>
        );
      }
    },
    {
      key: "reported_date",
      label: "Reported Date and Time",
      render: (r) => {
        if (!r.reported_date) return <span className="text-slate-400">—</span>;
        const time = r.detection_time ? ` ${r.detection_time}` : "";
        return <span className="text-sm text-slate-700">{r.reported_date}{time}</span>;
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search by ID, asset, city..."
                className="pl-9 h-9 text-sm w-56 bg-slate-50 border-slate-200"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-9 text-sm w-32"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="P1">P1</SelectItem>
                <SelectItem value="P2">P2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterShelterType} onValueChange={setFilterShelterType}>
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="All Shelter Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shelter Types</SelectItem>
                {uniqueShelterTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="All Cities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterWO} onValueChange={setFilterWO}>
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="All (Work Orders)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Work Orders)</SelectItem>
                <SelectItem value="with">With Work Order</SelectItem>
                <SelectItem value="without">No Work Order</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterReportedDate}
              onChange={e => setFilterReportedDate(e.target.value)}
              className="h-9 text-sm w-40 bg-slate-50 border-slate-200"
              title="Reported Date"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-slate-500">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="text-xs text-slate-500">{filteredIncidents.length} of {incidents.length} incidents shown</p>
          )}
        </div>

        <DraggableDataTable
          columns={columns}
          data={filteredIncidents}
          onRowClick={(row) => navigate(`/IncidentDetail?id=${row.id}`)}
          searchPlaceholder="Search incidents..."
          storageKey="incidents_table_columns_order"
          hideSearch
        />
      </div>
      <IncidentFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={(data, pendingFiles) => createMutation.mutate({ data, pendingFiles })} />
    </div>
  );
}