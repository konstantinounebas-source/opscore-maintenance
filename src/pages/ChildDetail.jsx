import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Package, Truck, MapPin, Calendar, Tag, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import ChildFormDialog from "@/components/childs/ChildFormDialog";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function ChildDetail() {
  const params = new URLSearchParams(window.location.search);
  const childId = params.get("id");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const { data: child, isLoading } = useQuery({
    queryKey: ["child", childId],
    queryFn: () => base44.entities.ChildAssets.filter({ id: childId }).then(r => r[0]),
    enabled: !!childId,
  });

  const { data: parentAssets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"],
    queryFn: () => base44.entities.Shipments.list(),
  });

  const { data: assetTransactions = [] } = useQuery({
    queryKey: ["assetTransactions", childId],
    queryFn: () => base44.entities.AssetTransactions.filter({ asset_id: childId }),
    enabled: !!childId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChildAssets.update(childId, data),
    onSuccess: async () => {
      const user = await base44.auth.me();
      await base44.entities.AssetTransactions.create({
        asset_id: childId,
        action: "Updated",
        details: "Child asset details updated",
        user: user?.email || "unknown",
      });
      queryClient.invalidateQueries({ queryKey: ["child", childId] });
      queryClient.invalidateQueries({ queryKey: ["assetTransactions", childId] });
      setEditOpen(false);
      toast({ title: "Child asset updated" });
    },
  });

  const getParentName = (id) => parentAssets.find(a => a.id === id)?.asset_name || id || "Unassigned";
  const getParentAssetId = (id) => parentAssets.find(a => a.id === id)?.asset_id || "";

  // Build combined audit trail from shipments + assetTransactions
  const childShipments = shipments.filter(s => s.child_asset_id === childId);

  const auditEntries = [
    ...childShipments.map(s => ({
      date: s.created_date,
      type: "shipment",
      action: "Shipment",
      details: `Moved to ${getParentName(s.parent_asset_id)}${s.details ? ` — ${s.details}` : ""}`,
      status: s.status,
      icon: "truck",
    })),
    ...assetTransactions.map(t => ({
      date: t.created_date,
      type: "transaction",
      action: t.action,
      details: t.details || "",
      user: t.user,
      note: t.note,
      icon: "log",
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatDate = (d) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd MMM yyyy, HH:mm"); } catch { return d; }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!child) return (
    <div className="p-8 text-center text-slate-500">Child asset not found.</div>
  );

  const parentName = getParentName(child.parent_asset_id);
  const parentAssetId = getParentAssetId(child.parent_asset_id);

  return (
    <div>
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/Childs">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-slate-900">{child.child_id}</h1>
            <p className="text-xs text-slate-500">{child.serial_number}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto">

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</p>
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Child ID" value={child.child_id} />
            <InfoRow icon={<Tag className="w-4 h-4" />} label="Serial Number" value={child.serial_number} />
            <InfoRow icon={<Package className="w-4 h-4" />} label="Category" value={child.category || "—"} />
            <InfoRow icon={<Package className="w-4 h-4" />} label="Type" value={child.child_type || "—"} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Installation Date" value={child.installation_date || "—"} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignment</p>
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Parent Asset ID" value={parentAssetId || "—"} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Parent Asset Name" value={parentName} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Assignment Status</span>
              <StatusBadge status={child.parent_asset_id ? "Assigned" : "Unassigned"} />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-slate-500 mb-1">Shipments</p>
              <p className="text-lg font-bold text-indigo-600">{childShipments.length}</p>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Audit Trail & History</p>
          {auditEntries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No history recorded yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-4">
                {auditEntries.map((entry, idx) => (
                  <div key={idx} className="relative pl-10">
                    <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                      entry.type === "shipment" ? "bg-blue-500" : "bg-indigo-400"
                    }`} />
                    <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {entry.type === "shipment" && <Truck className="w-3.5 h-3.5 text-blue-500" />}
                            <span className="text-sm font-semibold text-slate-800">{entry.action}</span>
                            {entry.status && <Badge variant="outline" className="text-xs">{entry.status}</Badge>}
                          </div>
                          {entry.details && <p className="text-xs text-slate-600 mt-0.5">{entry.details}</p>}
                          {entry.note && <p className="text-xs text-slate-400 mt-0.5 italic">{entry.note}</p>}
                          {entry.user && <p className="text-xs text-slate-400 mt-0.5">by {entry.user}</p>}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(entry.date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ChildFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        child={child}
        onSave={(data) => updateMutation.mutate(data)}
        parentAssets={parentAssets}
      />
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}