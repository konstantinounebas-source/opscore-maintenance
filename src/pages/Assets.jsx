import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatCard from "@/components/shared/StatCard";
import AssetFormDialog from "@/components/assets/AssetFormDialog";
import ImportAssetsDialog from "@/components/assets/ImportAssetsDialog";
import BusShelterOrderFormDialog from "@/components/assets/BusShelterOrderFormDialog";
import ImportBusShelterOrdersDialog from "@/components/assets/ImportBusShelterOrdersDialog";
import UnifiedAssetsTable from "@/components/assets/UnifiedAssetsTable";
import { Button } from "@/components/ui/button";
import { Box, Activity, Link2, AlertTriangle, Wrench, Plus, Download, Upload, BusFront } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [importOrdersOpen, setImportOrdersOpen] = useState(false);

  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: childAssets = [] } = useQuery({ queryKey: ["childAssets"], queryFn: () => base44.entities.ChildAssets.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const getChildCount = (assetId) => childAssets.filter(c => c.parent_asset_id === assetId).length;
  const getOpenIncidents = (assetId) => incidents.filter(i => i.related_asset_id === assetId && (i.status === "Open" || i.status === "In Progress")).length;
  const getOpenWorkOrders = (assetId) => workOrders.filter(w => w.related_asset_id === assetId && (w.status === "Open" || w.status === "In Progress")).length;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Assets.create(data),
    onSuccess: async (newAsset) => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({ asset_id: newAsset.id, action: "Asset Created", details: `Asset ${newAsset.asset_id} created`, user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setFormOpen(false);
      setNewOrderDefaults(null);
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

  const handleSave = async (formData, attachments = [], childComponents = []) => {
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data: formData });
      const user = await base44.auth.me();
      if (attachments.length > 0) {
        for (const file of attachments) {
          await base44.entities.AssetAttachments.create({
            asset_id: editingAsset.id,
            file_name: file.file_name, file_url: file.file_url,
            file_type: file.file_type, file_size: file.file_size,
            doc_label: file.doc_label, uploaded_by: user?.email,
          });
          await base44.entities.AssetTransactions.create({
            asset_id: editingAsset.id, action: "Document Uploaded",
            details: `${file.doc_label || file.file_type || "Document"}: ${file.file_name}`, user: user?.email,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["assets"] });
      }
    } else {
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
      const newAsset = await createMutation.mutateAsync({ ...formData, ...newOrderDefaults });
      if (!newAsset?.id) return;
      const user = await base44.auth.me();
      if (childComponents.length > 0) {
        for (const child of childComponents) {
          await base44.entities.ChildAssets.create({
            child_id: child.child_catalog_id || `CHILD-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            parent_asset_id: newAsset.id,
            category: child.child_category_snapshot || "",
            child_type: child.child_type_snapshot || "",
            description: child.child_name_snapshot || "",
            serial_number: child.serial_number || "",
            installation_date: child.installation_date || "",
          });
        }
        queryClient.invalidateQueries({ queryKey: ["childAssets"] });
      }
      if (attachments.length > 0) {
        for (const file of attachments) {
          await base44.entities.AssetAttachments.create({
            asset_id: newAsset.id,
            file_name: file.file_name, file_url: file.file_url,
            file_type: file.file_type || "Document", file_size: file.file_size,
            doc_label: file.doc_label, uploaded_by: user?.email,
          });
          await base44.entities.AssetTransactions.create({
            asset_id: newAsset.id, action: "Document Uploaded",
            details: `${file.doc_label || file.file_type || "Document"}: ${file.file_name}`, user: user?.email,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["assets"] });
      }
    }
  };

  const maintenanceAssets = useMemo(() => assets.filter(a => a.asset_source !== "bus_shelter_order"), [assets]);
  const busOrdersCount = assets.filter(a => a.asset_source === "bus_shelter_order").length;
  const activeAssets = maintenanceAssets.filter(a => a.status === "Active").length;
  const assetsWithOpenIncidents = assets.filter(a => getOpenIncidents(a.id) > 0).length;
  const assetsWithOpenWO = assets.filter(a => getOpenWorkOrders(a.id) > 0).length;
  const assetsWithChilds = maintenanceAssets.filter(a => getChildCount(a.id) > 0).length;

  const exportCSV = () => {
    const headers = ["asset_source","asset_id","asset_code","active_shelter_id","shelter_type","location_address","city","municipality","status","asset_stage","latitude","longitude","installation_date","delivery_date","notes"];
    const rows = assets.map(a => [a.asset_source||"",a.asset_id||"",a.asset_code||"",a.active_shelter_id||"",a.shelter_type||a.ordered_shelter_type||"",a.location_address||"",a.city||"",a.municipality||"",a.status||"",a.asset_stage||"",a.latitude||"",a.longitude||"",a.installation_date||"",a.delivery_date||"",a.notes||""]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "assets_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          asset_id: { type: "string" }, active_shelter_id: { type: "string" }, shelter_type: { type: "string" },
          location_address: { type: "string" }, city: { type: "string" }, status: { type: "string" },
          latitude: { type: "number" }, longitude: { type: "number" }, category: { type: "string" },
          asset_type: { type: "string" }, delivery_year: { type: "number" }, warranty_base_year: { type: "number" },
          installation_date: { type: "string" }, delivery_date: { type: "string" }, notes: { type: "string" },
          software_warranty_end_date: { type: "string" }, preventive_inspection_date: { type: "string" },
          next_inspection_date: { type: "string" }, electronics_warranty_end_date: { type: "string" },
          materials_warranty_end_date: { type: "string" }, structural_warranty_end_date: { type: "string" },
          evidence_types: { type: "string" }, description: { type: "string" },
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
        toast({ title: `Imported ${newItems.length} asset${newItems.length !== 1 ? "s" : ""}`, description: skipped > 0 ? `${skipped} duplicate(s) were skipped.` : undefined });
      } else {
        toast({ title: "No new assets to import", description: "All records already exist.", variant: "destructive" });
      }
    } else {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  // Route edit click to correct dialog based on asset source
  const handleEdit = (asset) => {
    if (asset.asset_source === "bus_shelter_order") {
      setEditingOrder(asset);
      setOrderFormOpen(true);
    } else {
      setEditingAsset(asset);
      setFormOpen(true);
    }
  };

  const handleOrderSave = async (formData, attachments, childComponents) => {
    await handleSave(formData, attachments, childComponents);
    setOrderFormOpen(false);
  };

  return (
    <div>
      <TopHeader
        title="Assets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOrdersOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Import Orders
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Import Assets
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => { setEditingOrder(null); setOrderFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Order
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => { setEditingAsset(null); setFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard label="Maintenance Assets" value={maintenanceAssets.length} icon={Box} color="indigo" />
          <StatCard label="Active" value={activeAssets} icon={Activity} color="green" />
          <StatCard label="With Childs" value={assetsWithChilds} icon={Link2} color="blue" />
          <StatCard label="Open Incidents" value={assetsWithOpenIncidents} icon={AlertTriangle} color="red" />
          <StatCard label="Open Work Orders" value={assetsWithOpenWO} icon={Wrench} color="amber" />
          <StatCard label="Bus Shelter Orders" value={busOrdersCount} icon={BusFront} color="purple" />
        </div>

        <UnifiedAssetsTable
          assets={assets}
          incidents={incidents}
          workOrders={workOrders}
          childAssets={childAssets}
          onEdit={handleEdit}
        />
      </div>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingAsset(null); }}
        asset={editingAsset}
        onSave={handleSave}
      />
      <ImportAssetsDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImportFile} />
      <BusShelterOrderFormDialog
        open={orderFormOpen}
        onOpenChange={setOrderFormOpen}
        order={editingOrder}
        onSave={handleOrderSave}
      />
      <ImportBusShelterOrdersDialog
        open={importOrdersOpen}
        onOpenChange={setImportOrdersOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["assets"] })}
      />
    </div>
  );
}