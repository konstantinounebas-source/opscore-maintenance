import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import ChildFormDialog from "@/components/childs/ChildFormDialog";
import AssignChildDialog from "@/components/childs/AssignChildDialog";
import ShipmentDialog from "@/components/childs/ShipmentDialog";
import ImportChildsDialog from "@/components/childs/ImportChildsDialog";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function Childs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);

  const { data: childAssets = [] } = useQuery({ queryKey: ["childAssets"], queryFn: () => base44.entities.ChildAssets.list() });
  const { data: parentAssets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: shipments = [] } = useQuery({ queryKey: ["shipments"], queryFn: () => base44.entities.Shipments.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChildAssets.create(data),
    onSuccess: async () => {
      const user = await base44.auth.me();
      queryClient.invalidateQueries({ queryKey: ["childAssets"] });
      setFormOpen(false);
      setEditingChild(null);
      toast({ title: "Child asset created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChildAssets.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["childAssets"] });
      setFormOpen(false);
      setEditingChild(null);
      toast({ title: "Child asset updated" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ childId, parentAssetId }) => base44.entities.ChildAssets.update(childId, { parent_asset_id: parentAssetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["childAssets"] });
      setAssignOpen(false);
      setSelectedChild(null);
      toast({ title: "Child assigned to asset" });
    },
  });

  const shipmentMutation = useMutation({
    mutationFn: async (data) => {
      const shipment = await base44.entities.Shipments.create(data);
      await base44.entities.ChildAssets.update(data.child_asset_id, { parent_asset_id: data.new_parent_asset_id });
      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["childAssets", "shipments"] });
      setShipmentOpen(false);
      setSelectedChild(null);
      toast({ title: "Shipment created and child reassigned" });
    },
  });

  const handleSave = (formData) => {
    if (editingChild) {
      updateMutation.mutate({ id: editingChild.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAssign = (parentAssetId) => {
    assignMutation.mutate({ childId: selectedChild.id, parentAssetId });
  };

  const handleShipment = (shipmentData) => {
    shipmentMutation.mutate({
      child_asset_id: selectedChild.id,
      parent_asset_id: selectedChild.parent_asset_id,
      new_parent_asset_id: shipmentData.new_parent_asset_id,
      status: "Pending",
      shipment_date: new Date().toISOString().split("T")[0],
      details: shipmentData.details,
    });
  };

  const getParentAssetName = (parentAssetId) => {
    return parentAssets.find(a => a.id === parentAssetId)?.asset_name || "Unassigned";
  };

  const assignedCount = childAssets.filter(c => c.parent_asset_id).length;
  const unassignedCount = childAssets.length - assignedCount;

  const exportCSV = () => {
    const headers = ["child_id", "parent_asset_id", "category", "serial_number", "installation_date", "child_type"];
    const rows = childAssets.map(c => [c.child_id, c.parent_asset_id || "", c.category || "", c.serial_number || "", c.installation_date || "", c.child_type || ""]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "childs_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          child_id: { type: "string" },
          parent_asset_id: { type: "string" },
          category: { type: "string" },
          serial_number: { type: "string" },
          installation_date: { type: "string" },
          child_type: { type: "string" },
        }
      }
    });
    if (result.status === "success" && result.output) {
      const items = Array.isArray(result.output) ? result.output : [result.output];
      const existingIds = new Set(childAssets.map(c => c.child_id));
      const newItems = items.filter(item => item.child_id && !existingIds.has(item.child_id));
      if (newItems.length > 0) {
        await base44.entities.ChildAssets.bulkCreate(newItems);
        queryClient.invalidateQueries({ queryKey: ["childAssets"] });
        toast({ title: `Imported ${newItems.length} child assets` });
      } else {
        toast({ title: "No new items to import" });
      }
    } else {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  const columns = [
    { key: "child_id", label: "Child ID" },
    { key: "parent", label: "Parent Asset", accessor: (row) => getParentAssetName(row.parent_asset_id) },
    { key: "category", label: "Category" },
    { key: "serial_number", label: "Serial Number" },
    { key: "installation_date", label: "Installation Date" },
    { key: "child_type", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.parent_asset_id ? "Assigned" : "Unassigned"} />
      ),
    },
  ];

  return (
    <div>
      <TopHeader
        title="Child Assets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => { setEditingChild(null); setFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Create Child
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-slate-600">Total Child Assets</p>
            <p className="text-2xl font-bold">{childAssets.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-slate-600">Assigned</p>
            <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-slate-600">Non-Assigned</p>
            <p className="text-2xl font-bold text-amber-600">{unassignedCount}</p>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={childAssets}
          onRowClick={(row) => navigate(`/ChildDetail?id=${row.id}`)}
          searchPlaceholder="Search child assets..."
        />
      </div>
      <ChildFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        child={editingChild}
        onSave={handleSave}
        parentAssets={parentAssets}
      />
      <AssignChildDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        child={selectedChild}
        parentAssets={parentAssets}
        onAssign={handleAssign}
        onShipment={() => {
          setAssignOpen(false);
          setShipmentOpen(true);
        }}
      />
      <ShipmentDialog
        open={shipmentOpen}
        onOpenChange={setShipmentOpen}
        child={selectedChild}
        parentAssets={parentAssets}
        onShipment={handleShipment}
      />
      <ImportChildsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImportFile}
      />
    </div>
  );
}