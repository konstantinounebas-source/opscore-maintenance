import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CheckCircle, XCircle } from "lucide-react";

const RESOURCE_TYPES = ["Crew", "Vehicle", "Equipment", "Mixed"];

const SEED_RESOURCES = [
  { resource_name: "Civil Crew", resource_type: "Crew", default_crew_size: 3, sort_order: 1 },
  { resource_name: "Installation Crew", resource_type: "Crew", default_crew_size: 2, sort_order: 2 },
  { resource_name: "Small Crew", resource_type: "Crew", default_crew_size: 2, sort_order: 3 },
  { resource_name: "Marking Crew", resource_type: "Crew", default_crew_size: 2, sort_order: 4 },
  { resource_name: "Traffic Management Crew", resource_type: "Crew", default_crew_size: 1, sort_order: 5 },
  { resource_name: "Truck", resource_type: "Vehicle", sort_order: 6 },
  { resource_name: "Mini Excavator", resource_type: "Equipment", sort_order: 7 },
];

function ResourceForm({ opt, onSave, onCancel }) {
  const [form, setForm] = useState({
    resource_name: opt?.resource_name || "",
    resource_type: opt?.resource_type || "Crew",
    default_crew_size: opt?.default_crew_size || "",
    description: opt?.description || "",
    sort_order: opt?.sort_order ?? 0,
    is_active: opt?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.resource_name.trim()) return alert("Resource name is required.");
    setSaving(true);
    const data = { ...form, default_crew_size: form.default_crew_size ? Number(form.default_crew_size) : null };
    if (opt?.id) {
      await base44.entities.StationLogResourceTypes.update(opt.id, data);
    } else {
      await base44.entities.StationLogResourceTypes.create({ ...data, is_active: true });
    }
    setSaving(false);
    onSave();
  };

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg m-2 space-y-3">
          <p className="text-xs font-bold text-blue-800 uppercase">{opt ? "Edit Resource" : "New Resource"}</p>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Name *</label>
              <Input className="mt-1 h-8 text-sm" value={form.resource_name} onChange={e => setForm(f => ({ ...f, resource_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Type</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}>
                {RESOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Default Crew Size</label>
              <Input type="number" className="mt-1 h-8 text-sm" value={form.default_crew_size}
                onChange={e => setForm(f => ({ ...f, default_crew_size: e.target.value }))} placeholder="e.g. 3" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
              <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="col-span-4">
              <label className="text-xs font-semibold text-slate-600 uppercase">Description</label>
              <Input className="mt-1 h-8 text-sm" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function Stage2ResourceTypesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null); // null=none, "new"=new form, id=edit
  const [showInactive, setShowInactive] = useState(false);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["stationLogResourceTypes"],
    queryFn: async () => {
      const data = await base44.entities.StationLogResourceTypes.list();
      if (data.length === 0) {
        await base44.entities.StationLogResourceTypes.bulkCreate(SEED_RESOURCES.map(r => ({ ...r, is_active: true })));
        return base44.entities.StationLogResourceTypes.list();
      }
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stationLogResourceTypes"] });
    setEditingId(null);
  };

  const handleToggle = async (r) => {
    await base44.entities.StationLogResourceTypes.update(r.id, { is_active: !r.is_active });
    refresh();
  };

  const filtered = resources
    .filter(r => showInactive || r.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Resource Types</h3>
          <p className="text-xs text-slate-500">Reusable crew, vehicle and equipment types used in work rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <Button size="sm" className="gap-1 h-8" onClick={() => setEditingId("new")}>
            <Plus className="h-3.5 w-3.5" /> Add Resource
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Resource Name</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Crew Size</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Description</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Sort</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingId === "new" && (
                <ResourceForm opt={null} onSave={refresh} onCancel={() => setEditingId(null)} />
              )}
              {filtered.map(r => (
                editingId === r.id ? (
                  <ResourceForm key={r.id} opt={r} onSave={refresh} onCancel={() => setEditingId(null)} />
                ) : (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.is_active === false ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.resource_name}</td>
                    <td className="px-3 py-2">
                      <Badge className="text-[10px] bg-slate-100 text-slate-600">{r.resource_type}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.default_crew_size ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{r.description || "—"}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{r.sort_order ?? 0}</td>
                    <td className="px-3 py-2">
                      <Badge className={r.is_active === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}>
                        {r.is_active === false ? "Inactive" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(r.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className={`h-7 w-7 p-0 ${r.is_active === false ? "text-green-600" : "text-slate-400 hover:text-red-500"}`}
                          onClick={() => handleToggle(r)}>
                          {r.is_active === false ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {filtered.length === 0 && editingId !== "new" && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">No resources found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}