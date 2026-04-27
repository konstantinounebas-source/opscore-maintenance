import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatCard from "@/components/shared/StatCard";
import AssetFormUnified from "@/components/assets/AssetFormUnified";
import ImportAssetsDialogUnified from "@/components/assets/ImportAssetsDialogUnified";
import UnifiedAssetsTable from "@/components/assets/UnifiedAssetsTable";
import { Button } from "@/components/ui/button";
import { Box, Activity, Link2, AlertTriangle, Wrench, Plus, Download, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ExportAssetsDialog from "@/components/assets/ExportAssetsDialog";

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingActive, setSettingActive] = useState(false);

  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: childAssets = [] } = useQuery({ queryKey: ["childAssets"], queryFn: () => base44.entities.ChildAssets.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const getChildCount = (assetId) => childAssets.filter(c => c.parent_asset_id === assetId).length;
  const getOpenIncidents = (assetId) => incidents.filter(i => i.related_asset_id === assetId && i.status !== "Closed" && i.status !== "Cancelled").length;
  const getOpenWorkOrders = (assetId) => workOrders.filter(w => w.related_asset_id === assetId && w.status !== "Completed" && w.status !== "Cancelled").length;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Assets.create(data),
    onSuccess: async (newAsset) => {
      const user = await base44.auth.me();
      const label = newAsset.active_shelter_id || newAsset.asset_id || "—";
      await base44.entities.AssetTransactions.create({ asset_id: newAsset.id, action: "Asset Created", details: `Asset ${label} created`, user: user?.email });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      try {
        const location = [newAsset.location_address, newAsset.city, newAsset.municipality].filter(Boolean).join(", ");
        await base44.integrations.Core.SendEmail({
          to: user?.email,
          subject: `New Asset Added: ${label}`,
          body: `A new asset has been added.\n\nShelter ID: ${label}\nLocation: ${location || "—"}\nAdded by: ${user?.email || "—"}\nDate: ${new Date().toLocaleString()}\n\nPlease log in to review the asset details.`,
        });
      } catch (_) { /* non-critical */ }
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
      if (attachments.length > 0) queryClient.invalidateQueries({ queryKey: ["assets"] });
    } else {
      // Duplicate check on primary identifier
      const primaryId = formData.active_shelter_id;
      const dupShelter = primaryId && assets.some(a =>
        (a.active_shelter_id && a.active_shelter_id === primaryId) ||
        (a.asset_code && a.asset_code === primaryId)
      );
      if (dupShelter) {
        toast({ title: "Duplicate asset", description: `An asset with Shelter ID "${primaryId}" already exists.`, variant: "destructive" });
        return;
      }
      const newAsset = await createMutation.mutateAsync({ ...formData });
      if (!newAsset?.id) return;
      const user = await base44.auth.me();
      for (const child of childComponents) {
        await base44.entities.ChildAssets.create({
          child_id: child.child_catalog_id || `CHILD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          parent_asset_id: newAsset.id,
          category: child.child_category_snapshot || "",
          child_type: child.child_type_snapshot || "",
          description: child.child_name_snapshot || "",
          serial_number: child.serial_number || "",
          installation_date: child.installation_date || "",
        });
      }
      if (childComponents.length > 0) queryClient.invalidateQueries({ queryKey: ["childAssets"] });
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
      if (attachments.length > 0) queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormOpen(true);
  };

  const handleSetAllActive = async () => {
    if (!window.confirm("Set all assets to status 'Active'? This will update in batches...")) return;
    setSettingActive(true);
    try {
      let offset = 0;
      let remaining = 1;
      while (remaining > 0) {
        const res = await base44.functions.invoke('bulkUpdateAssetsActive', { offset, batchSize: 10 });
        remaining = res.data.remaining;
        offset = res.data.nextOffset;
        toast({ title: `Updated ${res.data.updatedBatch} assets`, description: `${remaining} remaining...` });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      toast({ title: "Complete", description: "All assets set to Active" });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSettingActive(false);
    }
  };

  // Stats
  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status === "Active").length;
  const assetsWithOpenIncidents = assets.filter(a => getOpenIncidents(a.id) > 0).length;
  const assetsWithOpenWO = assets.filter(a => getOpenWorkOrders(a.id) > 0).length;
  const assetsWithChilds = assets.filter(a => getChildCount(a.id) > 0).length;



  return (
    <div>
      <TopHeader
        title="Assets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
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
          <StatCard label="Total Assets" value={totalAssets} icon={Box} color="indigo" />
          <StatCard label="Active" value={activeAssets} icon={Activity} color="green" />
          <StatCard label="With Childs" value={assetsWithChilds} icon={Link2} color="blue" />
          <StatCard label="Open Incidents" value={assetsWithOpenIncidents} icon={AlertTriangle} color="red" />
          <StatCard label="Open Work Orders" value={assetsWithOpenWO} icon={Wrench} color="amber" />
        </div>

        <UnifiedAssetsTable
          assets={assets}
          incidents={incidents}
          workOrders={workOrders}
          childAssets={childAssets}
          onEdit={handleEdit}
        />
      </div>

      <AssetFormUnified
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingAsset(null); }}
        asset={editingAsset}
        onSave={handleSave}
      />
      <ImportAssetsDialogUnified
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["assets"] })}
      />
      <ExportAssetsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        assets={assets}
      />
    </div>
  );
}