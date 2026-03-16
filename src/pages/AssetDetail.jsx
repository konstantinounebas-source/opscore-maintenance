import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DataTable from "@/components/shared/DataTable";
import AuditLog from "@/components/shared/AuditLog";
import FileUploader from "@/components/shared/FileUploader";
import AssetFormDialog from "@/components/assets/AssetFormDialog.jsx";
import ChildFormDialog from "@/components/assets/ChildFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Plus, AlertTriangle, Wrench, Download, FileText, Image, ExternalLink } from "lucide-react";

export default function AssetDetail() {
  const params = new URLSearchParams(window.location.search);
  const assetId = params.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [childFormOpen, setChildFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState(null);

  const { data: asset } = useQuery({ queryKey: ["asset", assetId], queryFn: () => base44.entities.Assets.filter({ id: assetId }).then(r => r[0]), enabled: !!assetId });
  const { data: children = [] } = useQuery({ queryKey: ["childAssets", assetId], queryFn: () => base44.entities.ChildAssets.filter({ parent_asset_id: assetId }), enabled: !!assetId });
  const { data: incidents = [] } = useQuery({ queryKey: ["assetIncidents", assetId], queryFn: () => base44.entities.Incidents.filter({ related_asset_id: assetId }), enabled: !!assetId });
  const { data: workOrders = [] } = useQuery({ queryKey: ["assetWorkOrders", assetId], queryFn: () => base44.entities.WorkOrders.filter({ related_asset_id: assetId }), enabled: !!assetId });
  const { data: attachments = [] } = useQuery({ queryKey: ["assetAttachments", assetId], queryFn: () => base44.entities.AssetAttachments.filter({ asset_id: assetId }), enabled: !!assetId });
  const { data: transactions = [] } = useQuery({ queryKey: ["assetTransactions", assetId], queryFn: () => base44.entities.AssetTransactions.filter({ asset_id: assetId }), enabled: !!assetId });
  const { data: shipments = [] } = useQuery({ queryKey: ["assetShipments", assetId], queryFn: () => base44.entities.Shipments.filter({ parent_asset_id: assetId }), enabled: !!assetId });

  const updateAsset = useMutation({
    mutationFn: (data) => base44.entities.Assets.update(assetId, data),
    onSuccess: async () => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Asset Updated", user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      setEditOpen(false);
      toast({ title: "Asset updated" });
    },
  });

  const createChild = useMutation({
    mutationFn: (data) => base44.entities.ChildAssets.create(data),
    onSuccess: async () => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Child Inserted", details: "New child asset added", user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] });
      setChildFormOpen(false);
      toast({ title: "Child added" });
    },
  });

  const updateChild = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChildAssets.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] });
      setChildFormOpen(false);
      setEditingChild(null);
      toast({ title: "Child updated" });
    },
  });

  const uploadAttachment = async (fileData) => {
    const user = await base44.auth.me();
    await base44.entities.AssetAttachments.create({ ...fileData, asset_id: assetId, uploaded_by: user?.email });
    await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Document Uploaded", details: fileData.file_name, user: user?.email });
    queryClient.invalidateQueries({ queryKey: ["assetAttachments", assetId] });
    queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] });
    toast({ title: "File uploaded" });
  };

  const handleChildSave = (data) => {
    if (editingChild) {
      updateChild.mutate({ id: editingChild.id, data });
    } else {
      createChild.mutate(data);
    }
  };

  const exportAssetDetails = () => {
    if (!asset) return;
    const lines = [`Asset ID,${asset.asset_id}`, `Name,${asset.asset_name}`, `Category,${asset.category}`, `Type,${asset.asset_type}`, `Status,${asset.status}`, `Location,${asset.location}`, `Installation Date,${asset.installation_date}`, `Description,"${asset.description || ""}"`];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `asset_${asset.asset_id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!asset) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const childColumns = [
    { key: "child_id", label: "ID" },
    { key: "category", label: "Category" },
    { key: "serial_number", label: "Serial Number" },
    { key: "installation_date", label: "Install Date" },
    { key: "child_type", label: "Type" },
  ];

  const incidentColumns = [
    { key: "incident_id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", label: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
    { key: "reported_date", label: "Reported" },
  ];

  const woColumns = [
    { key: "work_order_id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", label: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
    { key: "due_date", label: "Due Date" },
  ];

  const shipmentColumns = [
    { key: "shipment_id", label: "Shipment ID" },
    { key: "child_asset_id", label: "Child Asset" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "shipment_date", label: "Date" },
  ];

  return (
    <div>
      <TopHeader
        title={asset.asset_name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/Assets")}><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back</Button>
            <Button variant="outline" size="sm" onClick={exportAssetDetails}><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1.5" onClick={() => navigate(`/IncidentForm?asset_id=${assetId}`)}><AlertTriangle className="w-3.5 h-3.5" />Open Incident</Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Overview Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-xs text-slate-500 font-medium">Asset ID</p><p className="text-sm font-semibold mt-1">{asset.asset_id}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Category</p><p className="text-sm font-semibold mt-1">{asset.category || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Type</p><p className="text-sm font-semibold mt-1">{asset.asset_type || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Status</p><div className="mt-1"><StatusBadge status={asset.status} /></div></div>
            <div><p className="text-xs text-slate-500 font-medium">Location</p><p className="text-sm font-semibold mt-1">{asset.location || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Installation Date</p><p className="text-sm font-semibold mt-1">{asset.installation_date || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Childs</p><p className="text-sm font-semibold mt-1">{children.length}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Open Incidents</p><p className="text-sm font-semibold mt-1">{incidents.filter(i => i.status !== "Closed" && i.status !== "Resolved").length}</p></div>
          </div>
          {asset.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700">{asset.description}</p>
            </div>
          )}
        </div>

        <Tabs defaultValue="childs" className="space-y-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="childs">Childs ({children.length})</TabsTrigger>
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="workorders">Work Orders ({workOrders.length})</TabsTrigger>
            <TabsTrigger value="shipments">Shipments ({shipments.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({attachments.length})</TabsTrigger>
            <TabsTrigger value="log">Audit Log ({transactions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="childs">
            <div className="flex justify-end mb-3">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => { setEditingChild(null); setChildFormOpen(true); }}>
                <Plus className="w-3.5 h-3.5" /> Add Child
              </Button>
            </div>
            <DataTable columns={childColumns} data={children} onRowClick={(c) => { setEditingChild(c); setChildFormOpen(true); }} searchPlaceholder="Search childs..." />
          </TabsContent>

          <TabsContent value="incidents">
            <DataTable columns={incidentColumns} data={incidents} onRowClick={(r) => navigate(`/IncidentDetail?id=${r.id}`)} searchPlaceholder="Search incidents..." />
          </TabsContent>

          <TabsContent value="workorders">
            <DataTable columns={woColumns} data={workOrders} searchPlaceholder="Search work orders..." />
          </TabsContent>

          <TabsContent value="shipments">
            <DataTable columns={shipmentColumns} data={shipments} searchPlaceholder="Search shipments..." />
          </TabsContent>

          <TabsContent value="documents">
            <div className="flex justify-end mb-3">
              <FileUploader onUpload={uploadAttachment} label="Upload Document" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y">
              {attachments.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">No documents uploaded</p>}
              {attachments.map(att => (
                <div key={att.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {att.file_type === "Photo" ? <Image className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{att.file_name}</p>
                      <p className="text-xs text-slate-400">{att.file_size || "—"} · {att.uploaded_by || "—"} · {att.created_date ? format(new Date(att.created_date), "MMM d, yyyy") : "—"}</p>
                    </div>
                  </div>
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="log">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <AuditLog entries={[...transactions].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AssetFormDialog open={editOpen} onOpenChange={setEditOpen} asset={asset} onSave={(data) => updateAsset.mutate(data)} />
      <ChildFormDialog open={childFormOpen} onOpenChange={setChildFormOpen} child={editingChild} parentAssetId={assetId} onSave={handleChildSave} />
    </div>
  );
}