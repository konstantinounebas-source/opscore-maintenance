import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatCard from "@/components/shared/StatCard";
import DraggableDataTable from "@/components/shared/DraggableDataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import AssetFormDialog from "@/components/assets/AssetFormDialog";
import ImportAssetsDialog from "@/components/assets/ImportAssetsDialog";
import BusShelterOrdersTab from "@/components/assets/BusShelterOrdersTab";
import BusShelterOrderFormDialog from "@/components/assets/BusShelterOrderFormDialog";
import ImportBusShelterOrdersDialog from "@/components/assets/ImportBusShelterOrdersDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Box, Activity, Link2, AlertTriangle, Wrench, Plus, Download, Upload, Search, X, BusFront } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("maintenance");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [newOrderDefaults, setNewOrderDefaults] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [importOrdersOpen, setImportOrdersOpen] = useState(false);

  // Filter state (maintenance tab)
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterShelterType, setFilterShelterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDeliveryDate, setFilterDeliveryDate] = useState("");
  const [filterChilds, setFilterChilds] = useState("all");
  const [filterOpenIncidents, setFilterOpenIncidents] = useState("all");
  const [filterOpenWO, setFilterOpenWO] = useState("all");

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

  const getChildCount = (assetId) => childAssets.filter(c => c.parent_asset_id === assetId).length;
  const getOpenIncidents = (assetId) => incidents.filter(i => i.related_asset_id === assetId && (i.status === "Open" || i.status === "In Progress")).length;
  const getOpenWorkOrders = (assetId) => workOrders.filter(w => w.related_asset_id === assetId && (w.status === "Open" || w.status === "In Progress")).length;

  // Maintenance assets only (exclude bus_shelter_order)
  const maintenanceAssets = useMemo(() =>
    assets.filter(a => a.asset_source !== "bus_shelter_order"),
    [assets]
  );

  const activeAssets = maintenanceAssets.filter(a => a.status === "Active").length;
  const assetsWithChilds = maintenanceAssets.filter(a => getChildCount(a.id) > 0).length;
  const assetsWithOpenIncidents = maintenanceAssets.filter(a => getOpenIncidents(a.id) > 0).length;
  const assetsWithOpenWO = maintenanceAssets.filter(a => getOpenWorkOrders(a.id) > 0).length;
  const busOrdersCount = assets.filter(a => a.asset_source === "bus_shelter_order").length;

  const uniqueCategories = [...new Set(maintenanceAssets.map(a => a.category).filter(Boolean))].sort();
  const uniqueCities = [...new Set(maintenanceAssets.map(a => a.city).filter(Boolean))].sort();
  const uniqueShelterTypes = [...new Set(maintenanceAssets.map(a => a.shelter_type).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(maintenanceAssets.map(a => a.status).filter(Boolean))].sort();

  const filteredAssets = useMemo(() => {
    return maintenanceAssets.filter(a => {
      const childs = getChildCount(a.id);
      const openInc = getOpenIncidents(a.id);
      const openWO = getOpenWorkOrders(a.id);
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const matches = [a.asset_id, a.active_shelter_id, a.category, a.city, a.shelter_type, a.status, a.delivery_date]
          .some(v => v && String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (filterCategory !== "all" && a.category !== filterCategory) return false;
      if (filterCity !== "all" && a.city !== filterCity) return false;
      if (filterShelterType !== "all" && a.shelter_type !== filterShelterType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterDeliveryDate && a.delivery_date !== filterDeliveryDate) return false;
      if (filterChilds === "with" && childs === 0) return false;
      if (filterChilds === "without" && childs > 0) return false;
      if (filterOpenIncidents === "with" && openInc === 0) return false;
      if (filterOpenIncidents === "without" && openInc > 0) return false;
      if (filterOpenWO === "with" && openWO === 0) return false;
      if (filterOpenWO === "without" && openWO > 0) return false;
      return true;
    });
  }, [maintenanceAssets, searchText, filterCategory, filterCity, filterShelterType, filterStatus, filterDeliveryDate, filterChilds, filterOpenIncidents, filterOpenWO, childAssets, incidents, workOrders]);

  const hasActiveFilters = searchText || filterCategory !== "all" || filterCity !== "all" ||
    filterShelterType !== "all" || filterStatus !== "all" || filterDeliveryDate ||
    filterChilds !== "all" || filterOpenIncidents !== "all" || filterOpenWO !== "all";

  const clearFilters = () => {
    setSearchText(""); setFilterCategory("all"); setFilterCity("all");
    setFilterShelterType("all"); setFilterStatus("all"); setFilterDeliveryDate("");
    setFilterChilds("all"); setFilterOpenIncidents("all"); setFilterOpenWO("all");
  };

  const exportCSV = () => {
    const headers = ["asset_id","active_shelter_id","shelter_type","location_address","city","status","latitude","longitude","category","asset_type","delivery_year","warranty_base_year","installation_date","delivery_date","notes","software_warranty_end_date","preventive_inspection_date","next_inspection_date","electronics_warranty_end_date","materials_warranty_end_date","structural_warranty_end_date","description"];
    const rows = maintenanceAssets.map(a => [a.asset_id,a.active_shelter_id||"",a.shelter_type||"",a.location_address||"",a.city||"",a.status||"",a.latitude||"",a.longitude||"",a.category||"",a.asset_type||"",a.delivery_year||"",a.warranty_base_year||"",a.installation_date||"",a.delivery_date||"",a.notes||"",a.software_warranty_end_date||"",a.preventive_inspection_date||"",a.next_inspection_date||"",a.electronics_warranty_end_date||"",a.materials_warranty_end_date||"",a.structural_warranty_end_date||"",a.description||""]);
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

  const columns = [
    { key: "active_shelter_id", label: "Shelter ID" },
    { key: "city", label: "City" },
    { key: "shelter_type", label: "Shelter Type" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "delivery_date", label: "Delivery Date", render: (r) => { if (!r.delivery_date) return <span className="text-slate-400">—</span>; const [y,m,d] = r.delivery_date.split("-"); return <span>{d}/{m}/{y}</span>; } },
    { key: "childs", label: "Childs", accessor: (row) => getChildCount(row.id) },
    { key: "incidents", label: "Open Incidents", accessor: (row) => getOpenIncidents(row.id) },
    { key: "work_orders", label: "Open WOs", accessor: (row) => getOpenWorkOrders(row.id) },
  ];

  const handleNewOrder = () => {
    setEditingOrder(null);
    setOrderFormOpen(true);
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setOrderFormOpen(true);
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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => { setEditingAsset(null); setNewOrderDefaults(null); setFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard label="Total Assets" value={maintenanceAssets.length} icon={Box} color="indigo" />
          <StatCard label="Active" value={activeAssets} icon={Activity} color="green" />
          <StatCard label="With Childs" value={assetsWithChilds} icon={Link2} color="blue" />
          <StatCard label="Open Incidents" value={assetsWithOpenIncidents} icon={AlertTriangle} color="red" />
          <StatCard label="Open Work Orders" value={assetsWithOpenWO} icon={Wrench} color="amber" />
          <StatCard label="Bus Shelter Orders" value={busOrdersCount} icon={BusFront} color="purple" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="maintenance">Maintenance Assets</TabsTrigger>
            <TabsTrigger value="bus_shelter_orders">
              Bus Shelter Orders
              {busOrdersCount > 0 && (
                <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{busOrdersCount}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search by ID, shelter, city..." className="pl-9 h-9 text-sm w-56 bg-slate-50 border-slate-200" />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="City" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterShelterType} onValueChange={setFilterShelterType}>
                  <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Shelter Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shelter Types</SelectItem>
                    {uniqueShelterTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={filterDeliveryDate} onChange={e => setFilterDeliveryDate(e.target.value)} className="h-9 text-sm w-40 bg-slate-50 border-slate-200" title="Delivery Date" />
                <Select value={filterChilds} onValueChange={setFilterChilds}>
                  <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Childs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Childs)</SelectItem>
                    <SelectItem value="with">With Childs</SelectItem>
                    <SelectItem value="without">Without Childs</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterOpenIncidents} onValueChange={setFilterOpenIncidents}>
                  <SelectTrigger className="h-9 text-sm w-44"><SelectValue placeholder="Open Incidents" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Incidents)</SelectItem>
                    <SelectItem value="with">With Open Incidents</SelectItem>
                    <SelectItem value="without">No Open Incidents</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterOpenWO} onValueChange={setFilterOpenWO}>
                  <SelectTrigger className="h-9 text-sm w-44"><SelectValue placeholder="Open WOs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Work Orders)</SelectItem>
                    <SelectItem value="with">With Open WOs</SelectItem>
                    <SelectItem value="without">No Open WOs</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-slate-500">
                    <X className="w-3.5 h-3.5" /> Clear
                  </Button>
                )}
              </div>
              {hasActiveFilters && (
                <p className="text-xs text-slate-500">{filteredAssets.length} of {maintenanceAssets.length} assets shown</p>
              )}
            </div>
            <DraggableDataTable
              columns={columns}
              data={filteredAssets}
              onRowClick={(row) => navigate(`/AssetDetail?id=${row.id}`)}
              hideSearch
              storageKey="assets_table_columns_order"
            />
          </TabsContent>

          <TabsContent value="bus_shelter_orders">
            <BusShelterOrdersTab assets={assets} onNewOrder={handleNewOrder} onImport={() => setImportOrdersOpen(true)} onEditOrder={handleEditOrder} />
          </TabsContent>
        </Tabs>
      </div>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setNewOrderDefaults(null); }}
        asset={editingAsset}
        onSave={handleSave}
        defaultValues={newOrderDefaults}
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