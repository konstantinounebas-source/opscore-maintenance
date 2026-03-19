import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import AssetFormDialog from "@/components/assets/AssetFormDialog";
import ImportAssetsDialog from "@/components/assets/ImportAssetsDialog";
import { Button } from "@/components/ui/button";
import { Box, Activity, Link2, AlertTriangle, Wrench, Plus, Download, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: childAssets = [] } = useQuery({ queryKey: ["childAssets"], queryFn: () => base44.entities.ChildAssets.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Assets.create(data),
    onSuccess: async (newAsset) => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({ asset_id: newAsset.id, action: "Asset Created", details: `Asset ${newAsset.asset_id} created`, user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setFormOpen(false);
      toast({ title: "Asset created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Assets.update(id, data),
    onSuccess: async () => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({ asset_id: editingAsset.id, action: "Asset Updated", details: "Asset information modified", user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setFormOpen(false);
      setEditingAsset(null);
      toast({ title: "Asset updated successfully" });
    },
  });

  const handleSave = async (formData, attachments = []) => {
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data: formData });
    } else {
      // Check for duplicate asset_id or active_shelter_id
      const dupId = formData.asset_id && assets.some(a => a.asset_id === formData.asset_id);
      const dupShelter = formData.active_shelter_id && assets.some(a => a.active_shelter_id === formData.active_shelter_id);
      if (dupId || dupShelter) {
        toast({
          title: "Duplicate asset",
          description: dupShelter
            ? `An asset with Active Shelter ID "${formData.active_shelter_id}" already exists.`
            : `An asset with Asset ID "${formData.asset_id}" already exists.`,
          variant: "destructive",
        });
        return;
      }
      const newAsset = await createMutation.mutateAsync(formData);
      // Save attachments after asset is created
      if (attachments.length > 0 && newAsset?.id) {
        for (const file of attachments) {
          await base44.entities.AssetAttachments.create({
            asset_id: newAsset.id,
            file_name: file.file_name,
            file_url: file.file_url,
            file_type: file.file_type,
            file_size: file.file_size,
            uploaded_by: (await base44.auth.me())?.email
          });
        }
        queryClient.invalidateQueries({ queryKey: ["assets"] });
      }
    }
  };

  const getChildCount = (assetId) => childAssets.filter(c => c.parent_asset_id === assetId).length;
  const getOpenIncidents = (assetId) => incidents.filter(i => i.related_asset_id === assetId && (i.status === "Open" || i.status === "In Progress")).length;
  const getOpenWorkOrders = (assetId) => workOrders.filter(w => w.related_asset_id === assetId && (w.status === "Open" || w.status === "In Progress")).length;

  const activeAssets = assets.filter(a => a.status === "Active").length;
  const assetsWithChilds = assets.filter(a => getChildCount(a.id) > 0).length;
  const assetsWithOpenIncidents = assets.filter(a => getOpenIncidents(a.id) > 0).length;
  const assetsWithOpenWO = assets.filter(a => getOpenWorkOrders(a.id) > 0).length;

  const exportCSV = () => {
    const headers = ["asset_id", "asset_name", "category", "asset_type", "active_shelter_id", "location_address", "city", "shelter_type", "status", "installation_date", "delivery_date", "delivery_year", "latitude", "longitude", "notes"];
    const rows = assets.map(a => [a.asset_id, a.asset_name, a.category || "", a.asset_type || "", a.active_shelter_id || "", a.location_address || "", a.city || "", a.shelter_type || "", a.status || "", a.installation_date || "", a.delivery_date || "", a.delivery_year || "", a.latitude || "", a.longitude || "", a.notes || ""]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets_export.csv";
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
          asset_id: { type: "string" },
          asset_name: { type: "string" },
          category: { type: "string" },
          asset_type: { type: "string" },
          active_shelter_id: { type: "string" },
          location_address: { type: "string" },
          city: { type: "string" },
          shelter_type: { type: "string" },
          status: { type: "string" },
          installation_date: { type: "string" },
          delivery_date: { type: "string" },
          delivery_year: { type: "number" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          notes: { type: "string" },
        }
      }
    });
    if (result.status === "success" && result.output) {
      const items = Array.isArray(result.output) ? result.output : [result.output];
      const existingAssetIds = new Set(assets.map(a => a.asset_id).filter(Boolean));
      const existingShelterIds = new Set(assets.map(a => a.active_shelter_id).filter(Boolean));
      const newItems = items.filter(item => {
        if (!item.asset_id && !item.active_shelter_id) return false;
        if (item.asset_id && existingAssetIds.has(item.asset_id)) return false;
        if (item.active_shelter_id && existingShelterIds.has(item.active_shelter_id)) return false;
        return true;
      });
      const skipped = items.length - newItems.length;
      if (newItems.length > 0) {
        await base44.entities.Assets.bulkCreate(newItems);
        queryClient.invalidateQueries({ queryKey: ["assets"] });
        toast({
          title: `Imported ${newItems.length} asset${newItems.length !== 1 ? "s" : ""}`,
          description: skipped > 0 ? `${skipped} duplicate(s) were skipped.` : undefined,
        });
      } else {
        toast({ title: "No new assets to import", description: "All records already exist in the system.", variant: "destructive" });
      }
    } else {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  const columns = [
    { key: "asset_id", label: "Asset ID" },
    { key: "asset_name", label: "Name" },
    { key: "active_shelter_id", label: "Shelter ID" },
    { key: "category", label: "Category" },
    { key: "asset_type", label: "Type" },
    { key: "city", label: "City" },
    { key: "shelter_type", label: "Shelter Type" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "installation_date", label: "Install Date" },
    { key: "childs", label: "Childs", accessor: (row) => getChildCount(row.id) },
    { key: "incidents", label: "Open Incidents", accessor: (row) => getOpenIncidents(row.id) },
    { key: "work_orders", label: "Open WOs", accessor: (row) => getOpenWorkOrders(row.id) },
  ];

  return (
    <div>
      <TopHeader
        title="Assets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => { setEditingAsset(null); setFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Assets" value={assets.length} icon={Box} color="indigo" />
          <StatCard label="Active" value={activeAssets} icon={Activity} color="green" />
          <StatCard label="With Childs" value={assetsWithChilds} icon={Link2} color="blue" />
          <StatCard label="Open Incidents" value={assetsWithOpenIncidents} icon={AlertTriangle} color="red" />
          <StatCard label="Open Work Orders" value={assetsWithOpenWO} icon={Wrench} color="amber" />
        </div>
        <DataTable
          columns={columns}
          data={assets}
          onRowClick={(row) => navigate(`/AssetDetail?id=${row.id}`)}
          searchPlaceholder="Search assets..."
        />
      </div>
      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editingAsset}
        onSave={handleSave}
      />
      <ImportAssetsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImportFile}
      />
    </div>
  );
}