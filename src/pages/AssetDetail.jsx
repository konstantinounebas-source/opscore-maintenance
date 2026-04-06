import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DataTable from "@/components/shared/DataTable";
import AuditLog from "@/components/shared/AuditLog";
import FileUploader from "@/components/shared/FileUploader";
import AssetFormDialog from "@/components/assets/AssetFormDialog";
import ChildFormDialog from "@/components/assets/ChildFormDialog";
import AddChildFromTemplateDialog from "@/components/assets/AddChildFromTemplateDialog";
import MoveChildDialog from "@/components/childs/MoveChildDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Plus, AlertTriangle, Wrench, Download, FileText, Image, ExternalLink, Send, ChevronDown, ChevronUp } from "lucide-react";

export default function AssetDetail() {
  const params = new URLSearchParams(window.location.search);
  const assetId = params.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [childFormOpen, setChildFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const editingChildRef = React.useRef(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [childToMove, setChildToMove] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const { data: asset } = useQuery({ queryKey: ["asset", assetId], queryFn: () => base44.entities.Assets.filter({ id: assetId }).then(r => r[0]), enabled: !!assetId });
  const { data: children = [] } = useQuery({ queryKey: ["childAssets", assetId], queryFn: () => base44.entities.ChildAssets.filter({ parent_asset_id: assetId }), enabled: !!assetId });
  const { data: incidents = [] } = useQuery({ queryKey: ["assetIncidents", assetId], queryFn: () => base44.entities.Incidents.filter({ related_asset_id: assetId }), enabled: !!assetId });
  const { data: workOrders = [] } = useQuery({ queryKey: ["assetWorkOrders", assetId], queryFn: () => base44.entities.WorkOrders.filter({ related_asset_id: assetId }), enabled: !!assetId });
  const { data: attachments = [] } = useQuery({ queryKey: ["assetAttachments", assetId], queryFn: () => base44.entities.AssetAttachments.filter({ asset_id: assetId }), enabled: !!assetId });
  const { data: incidentAttachments = [] } = useQuery({ queryKey: ["incidentAttachments", assetId], queryFn: () => {
    if (!incidents || incidents.length === 0) return [];
    return Promise.all(incidents.map(inc => base44.entities.IncidentAttachments.filter({ incident_id: inc.id }))).then(results => results.flat());
  }, enabled: !!assetId && incidents && incidents.length > 0 });
  const { data: transactions = [] } = useQuery({ queryKey: ["assetTransactions", assetId], queryFn: () => base44.entities.AssetTransactions.filter({ asset_id: assetId }), enabled: !!assetId });
  const { data: shipments = [] } = useQuery({ queryKey: ["assetShipments", assetId], queryFn: () => base44.entities.Shipments.filter({ parent_asset_id: assetId }), enabled: !!assetId });
  const { data: outgoingShipments = [] } = useQuery({ queryKey: ["assetShipmentsSource", assetId], queryFn: () => base44.entities.Shipments.filter({ source_asset_id: assetId }), enabled: !!assetId });
  const allShipments = [...shipments, ...outgoingShipments].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
  const { data: allAssets = [] } = useQuery({ queryKey: ["allAssets"], queryFn: () => base44.entities.Assets.list() });

  const updateAsset = useMutation({
    mutationFn: ({ data }) => base44.entities.Assets.update(assetId, data),
    onSuccess: async (_, { data, attachments = [] }) => {
      const user = await base44.auth.me();
      // Save any new attachments added in the edit form
      for (const file of attachments) {
        await base44.entities.AssetAttachments.create({
          asset_id: assetId,
          file_name: file.file_name,
          file_url: file.file_url,
          file_type: file.file_type || "Document",
          file_size: file.file_size,
          doc_label: file.doc_label,
          uploaded_by: user?.email,
        });
        await base44.entities.AssetTransactions.create({
          asset_id: assetId,
          action: "Document Uploaded",
          details: `${file.doc_label || file.file_type || "Document"}: ${file.file_name}`,
          user: user?.email,
        });
      }
      const changes = Object.entries(data).filter(([key, val]) => asset[key] !== val).map(([key, val]) => `${key}: ${asset[key]} → ${val}`).join(", ");
      await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Asset Updated", details: changes || "Asset information modified", user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assetAttachments", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] });
      queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] });
      setEditOpen(false);
      toast({ title: "Asset updated" });
    },
  });

  const CHILD_FIELD_LABELS = {
    child_id: "Child ID",
    category: "Category",
    serial_number: "Serial Number",
    installation_date: "Installation Date",
    child_type: "Type",
    description: "Description",
    unit_price: "Unit Price (€)",
    parent_asset_id: "Parent Asset",
    status: "Status",
  };

  const createChild = useMutation({
    mutationFn: (data) => base44.entities.ChildAssets.create(data),
    onSuccess: async (newChild) => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({
        asset_id: assetId,
        action: "Child Added",
        details: `Added child "${newChild.description || newChild.child_id}" — Category: ${newChild.category || "—"}, Type: ${newChild.child_type || "—"}, Serial: ${newChild.serial_number || "—"}`,
        user: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] });
      setChildFormOpen(false);
      toast({ title: "Child added" });
    },
  });

  const updateChild = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChildAssets.update(id, data),
    onSuccess: async (updatedChild, { data }) => {
      const user = await base44.auth.me();
      const prev = editingChildRef.current;
      const fieldChanges = Object.entries(data)
        .filter(([key, val]) => prev && prev[key] !== val && CHILD_FIELD_LABELS[key])
        .map(([key, val]) => `${CHILD_FIELD_LABELS[key]}: "${prev[key] || "—"}" → "${val || "—"}"`)
        .join("; ");
      await base44.entities.AssetTransactions.create({
        asset_id: assetId,
        action: "Child Updated",
        details: fieldChanges || `Child "${data.description || data.child_id}" updated — no field changes detected`,
        user: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] });
      setChildFormOpen(false);
      setEditingChild(null);
      editingChildRef.current = null;
      toast({ title: "Child updated" });
    },
  });

  const uploadAttachment = async (fileData) => {
    const user = await base44.auth.me();
    await base44.entities.AssetAttachments.create({ ...fileData, asset_id: assetId, uploaded_by: user?.email });
    await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Document Uploaded", details: `${fileData.file_type || "Document"}: ${fileData.file_name}`, user: user?.email });
    queryClient.invalidateQueries({ queryKey: ["assetAttachments", assetId] });
    queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] });
    toast({ title: "File uploaded" });
  };

  const handleChildSave = (data) => {
    if (editingChild) {
      editingChildRef.current = editingChild; // snapshot before mutation
      updateChild.mutate({ id: editingChild.id, data });
    } else {
      createChild.mutate(data);
    }
  };

  const handleMoveChild = async (child, destinationAssetId) => {
    const user = await base44.auth.me();
    const today = new Date().toISOString().split("T")[0];
    if (destinationAssetId === "unassigned") {
      await base44.entities.ChildAssets.update(child.id, { parent_asset_id: "", status: "Un-Assigned" });
      await base44.entities.Shipments.create({
        shipment_id: `SHP-${Date.now()}`,
        child_asset_id: child.id,
        child_description: child.description || child.child_id,
        source_asset_id: assetId,
        parent_asset_id: "",
        status: "Returned",
        shipment_date: today,
        details: `Returned to inventory from asset ${asset?.asset_id || assetId}`,
      });
      await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Child Set Un-Assigned", details: `${child.child_id} set as Un-Assigned`, user: user?.email });
    } else {
      const destAsset = allAssets.find(a => a.id === destinationAssetId);
      await base44.entities.ChildAssets.update(child.id, { parent_asset_id: destinationAssetId });
      await base44.entities.Shipments.create({
        shipment_id: `SHP-${Date.now()}`,
        child_asset_id: child.id,
        child_description: child.description || child.child_id,
        source_asset_id: assetId,
        parent_asset_id: destinationAssetId,
        status: "Delivered",
        shipment_date: today,
        details: `Moved from ${asset?.asset_id || assetId} to ${destAsset?.asset_id || destinationAssetId}`,
      });
      await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Child Moved", details: `${child.child_id} moved to ${destAsset?.asset_id || destinationAssetId}`, user: user?.email });
    }
    queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] });
    queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] });
    queryClient.invalidateQueries({ queryKey: ["assetShipments", assetId] });
    queryClient.invalidateQueries({ queryKey: ["assetShipmentsSource", assetId] });
    setMoveDialogOpen(false);
    setChildToMove(null);
    toast({ title: "Child asset moved" });
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
    {
      key: "move",
      label: "",
      render: (child) => (
        <button
          onClick={(e) => { e.stopPropagation(); setChildToMove(child); setMoveDialogOpen(true); }}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="Move to another asset or inventory"
        >
          <Send className="w-4 h-4 text-indigo-600" />
        </button>
      ),
    },
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
    { key: "child_description", label: "Child", render: (r) => <span>{r.child_description || r.child_asset_id}</span> },
    {
      key: "source_asset_id", label: "From",
      render: (r) => {
        const src = r.source_asset_id ? allAssets.find(a => a.id === r.source_asset_id) : null;
        return <span className="text-xs">{src ? `${src.asset_id}` : (r.source_asset_id ? r.source_asset_id : "—")}</span>;
      }
    },
    {
      key: "parent_asset_id", label: "To",
      render: (r) => {
        if (!r.parent_asset_id) return <span className="text-xs text-slate-400">Inventory (Un-Assigned)</span>;
        const dest = allAssets.find(a => a.id === r.parent_asset_id);
        return <span className="text-xs">{dest ? `${dest.asset_id}` : r.parent_asset_id}</span>;
      }
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "shipment_date", label: "Date" },
    { key: "details", label: "Details", render: (r) => <span className="text-xs text-slate-500">{r.details || "—"}</span> },
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
          {/* Always-visible fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Field label="Asset ID" value={asset.asset_id} />
            <Field label="Active Shelter ID" value={asset.active_shelter_id} />
            <Field label="Asset Name" value={asset.asset_name} />
            <Field label="Status"><StatusBadge status={asset.status} /></Field>
            <Field label="City" value={asset.city} />
            <Field label="Shelter Type" value={asset.shelter_type} />
            <Field label="Location / Address" value={asset.location_address} />
            <Field label="Installation Date" value={asset.installation_date} />
          </div>

          {/* Expandable extra fields */}
          {showMore && (
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
              <Field label="Delivery Date" value={asset.delivery_date} />
              <Field label="Delivery Year" value={asset.delivery_year} />
              <Field label="Warranty Base Year" value={asset.warranty_base_year} />
              <Field label="Software Warranty End" value={asset.software_warranty_end_date} />
              <Field label="Electronics Warranty End" value={asset.electronics_warranty_end_date} />
              <Field label="Materials Warranty End" value={asset.materials_warranty_end_date} />
              <Field label="Structural Warranty End" value={asset.structural_warranty_end_date} />
              <Field label="Preventive Inspection" value={asset.preventive_inspection_date} />
              <Field label="Next Inspection" value={asset.next_inspection_date} />
              <Field label="Latitude" value={asset.latitude} />
              <Field label="Longitude" value={asset.longitude} />
              <Field label="Childs" value={children.length} />
              <Field label="Open Incidents" value={incidents.filter(i => i.status !== "Closed" && i.status !== "Resolved").length} />
              {asset.notes && <div className="col-span-2 md:col-span-4"><Field label="Notes" value={asset.notes} /></div>}
              {asset.description && <div className="col-span-2 md:col-span-4"><Field label="Description" value={asset.description} /></div>}
            </div>
          )}

          <button
            onClick={() => setShowMore(v => !v)}
            className="mt-5 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showMore ? <><ChevronUp className="w-3.5 h-3.5" /> Show Less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show More Info</>}
          </button>
        </div>

        <Tabs defaultValue="childs" className="space-y-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="childs">Childs ({children.length})</TabsTrigger>
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="workorders">Work Orders ({workOrders.length})</TabsTrigger>
            <TabsTrigger value="shipments">Shipments ({allShipments.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({attachments.length + incidentAttachments.length})</TabsTrigger>
            <TabsTrigger value="log">Audit Log ({transactions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="childs">
            <div className="flex justify-end mb-3 gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => setTemplateDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add from Type Template
              </Button>
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
            <DataTable columns={shipmentColumns} data={[...allShipments].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))} searchPlaceholder="Search shipments..." />
          </TabsContent>

          <TabsContent value="documents">
            <div className="flex justify-end mb-3">
              <FileUploader onUpload={uploadAttachment} label="Upload Document" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y">
              {attachments.length === 0 && incidentAttachments.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">No documents uploaded</p>}
              
              {attachments.length > 0 && (
                <>
                  <div className="px-5 py-3 bg-slate-50 font-semibold text-sm text-slate-700">Asset Documents</div>
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        {att.file_type === "Photo" ? <Image className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{att.file_name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {att.doc_label && <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{att.doc_label}</span>}
                            <p className="text-xs text-slate-400">{att.file_size || "—"} · {att.uploaded_by || "—"} · {att.created_date ? format(new Date(att.created_date), "MMM d, yyyy") : "—"}</p>
                          </div>
                        </div>
                      </div>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </>
              )}

              {incidentAttachments.length > 0 && (
                <>
                  <div className="px-5 py-3 bg-slate-50 font-semibold text-sm text-slate-700">Documents from Incidents</div>
                  {incidentAttachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        {att.file_type === "Photo" ? <Image className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{att.file_name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">From Incident</span>
                            <p className="text-xs text-slate-400">{att.file_size || "—"} · {att.uploaded_by || "—"} · {att.created_date ? format(new Date(att.created_date), "MMM d, yyyy") : "—"}</p>
                          </div>
                        </div>
                      </div>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="log">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <AuditLog entries={[...transactions].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AssetFormDialog open={editOpen} onOpenChange={setEditOpen} asset={asset} onSave={(data, attachments) => updateAsset.mutate({ data, attachments })} />

      <ChildFormDialog open={childFormOpen} onOpenChange={setChildFormOpen} child={editingChild} parentAssetId={assetId} onSave={handleChildSave} />
      <MoveChildDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen} child={childToMove} assets={allAssets} currentAssetId={assetId} onMove={handleMoveChild} />
      <AddChildFromTemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} asset={asset} onSave={(data) => base44.entities.ChildAssets.create(data).then(async (newChild) => { const user = await base44.auth.me(); await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Child Added", details: `Added child "${newChild.description || newChild.child_id}" from template`, user: user?.email }); queryClient.invalidateQueries({ queryKey: ["childAssets", assetId] }); queryClient.invalidateQueries({ queryKey: ["assetTransactions", assetId] }); })} />
    </div>
  );
}

function Field({ label, value, children }) {
  const hasValue = children != null || (value !== undefined && value !== null && value !== "");
  if (!hasValue) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <div className="text-sm font-semibold mt-1 text-slate-800">
        {children ?? String(value)}
      </div>
    </div>
  );
}