import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Incidents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);

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

  const columns = [
    { key: "incident_id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "related_asset_name", label: "Related Asset" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", label: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
    { key: "category", label: "Category" },
    { key: "reported_date", label: "Reported Date" },
    { key: "assigned_to", label: "Assigned To" },
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
      <div className="p-6">
        <DataTable
          columns={columns}
          data={incidents}
          onRowClick={(row) => navigate(`/IncidentDetail?id=${row.id}`)}
          searchPlaceholder="Search incidents..."
        />
      </div>
      <IncidentFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={(data, pendingFiles) => createMutation.mutate({ data, pendingFiles })} />
    </div>
  );
}