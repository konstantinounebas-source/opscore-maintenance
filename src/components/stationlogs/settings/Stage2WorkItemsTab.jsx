import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CheckCircle, XCircle } from "lucide-react";

const WORK_CATEGORIES = ["Civil", "Installation", "Removal", "Marking", "Traffic Management", "Other"];

const SEED_WORK_ITEMS = [
  { work_name: "Excavation", work_category: "Civil", sort_order: 1 },
  { work_name: "Platform / Base Preparation", work_category: "Civil", sort_order: 2 },
  { work_name: "Concrete Works", work_category: "Civil", sort_order: 3 },
  { work_name: "Simple Pavement", work_category: "Civil", sort_order: 4 },
  { work_name: "Tactile Pavement", work_category: "Civil", sort_order: 5 },
  { work_name: "New Shelter Installation", work_category: "Installation", sort_order: 6 },
  { work_name: "Signs Removal", work_category: "Removal", sort_order: 7 },
  { work_name: "Road Marking", work_category: "Marking", sort_order: 8 },
  { work_name: "Footway Construction", work_category: "Civil", sort_order: 9 },
  { work_name: "Site Cleaning", work_category: "Civil", sort_order: 10 },
];

const CATEGORY_COLORS = {
  Civil: "bg-amber-100 text-amber-700",
  Installation: "bg-blue-100 text-blue-700",
  Removal: "bg-red-100 text-red-700",
  Marking: "bg-purple-100 text-purple-700",
  "Traffic Management": "bg-orange-100 text-orange-700",
  Other: "bg-slate-100 text-slate-600",
};

function WorkItemForm({ opt, resources, onSave, onCancel }) {
  const [form, setForm] = useState({
    work_name: opt?.work_name || "",
    work_category: opt?.work_category || "Civil",
    default_resource_type_id: opt?.default_resource_type_id || "",
    description: opt?.description || "",
    sort_order: opt?.sort_order ?? 0,
    is_active: opt?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.work_name.trim()) return alert("Work name is required.");
    setSaving(true);
    if (opt?.id) {
      await base44.entities.StationLogWorkItems.update(opt.id, form);
    } else {
      await base44.entities.StationLogWorkItems.create({ ...form, is_active: true });
    }
    setSaving(false);
    onSave();
  };

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg m-2 space-y-3">
          <p className="text-xs font-bold text-blue-800 uppercase">{opt ? "Edit Work Item" : "New Work Item"}</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Work Name *</label>
              <Input className="mt-1 h-8 text-sm" value={form.work_name}
                onChange={e => setForm(f => ({ ...f, work_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Category</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.work_category} onChange={e => setForm(f => ({ ...f, work_category: e.target.value }))}>
                {WORK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
              <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Default Resource</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.default_resource_type_id}
                onChange={e => setForm(f => ({ ...f, default_resource_type_id: e.target.value }))}>
                <option value="">— none —</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.resource_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
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

export default function Stage2WorkItemsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: workItems = [], isLoading } = useQuery({
    queryKey: ["stationLogWorkItems"],
    queryFn: async () => {
      const data = await base44.entities.StationLogWorkItems.list();
      if (data.length === 0) {
        await base44.entities.StationLogWorkItems.bulkCreate(SEED_WORK_ITEMS.map(i => ({ ...i, is_active: true })));
        return base44.entities.StationLogWorkItems.list();
      }
      return data;
    },
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["stationLogResourceTypes"],
    queryFn: () => base44.entities.StationLogResourceTypes.list(),
  });

  const activeResources = resources.filter(r => r.is_active !== false);

  const getResourceName = (id) => resources.find(r => r.id === id)?.resource_name || "—";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stationLogWorkItems"] });
    setEditingId(null);
  };

  const handleToggle = async (item) => {
    await base44.entities.StationLogWorkItems.update(item.id, { is_active: !item.is_active });
    refresh();
  };

  const filtered = workItems
    .filter(i => showInactive || i.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Work Items Library</h3>
          <p className="text-xs text-slate-500">Reusable work items referenced in work rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <Button size="sm" className="gap-1 h-8" onClick={() => setEditingId("new")}>
            <Plus className="h-3.5 w-3.5" /> Add Work Item
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
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Work Name</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Category</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Default Resource</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Description</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Sort</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingId === "new" && (
                <WorkItemForm opt={null} resources={activeResources} onSave={refresh} onCancel={() => setEditingId(null)} />
              )}
              {filtered.map(item => (
                editingId === item.id ? (
                  <WorkItemForm key={item.id} opt={item} resources={activeResources} onSave={refresh} onCancel={() => setEditingId(null)} />
                ) : (
                  <tr key={item.id} className={`hover:bg-slate-50 ${item.is_active === false ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 font-medium text-slate-800">{item.work_name}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[10px] ${CATEGORY_COLORS[item.work_category] || "bg-slate-100 text-slate-600"}`}>
                        {item.work_category}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{getResourceName(item.default_resource_type_id)}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{item.description || "—"}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{item.sort_order ?? 0}</td>
                    <td className="px-3 py-2">
                      <Badge className={item.is_active === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}>
                        {item.is_active === false ? "Inactive" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(item.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className={`h-7 w-7 p-0 ${item.is_active === false ? "text-green-600" : "text-slate-400 hover:text-red-500"}`}
                          onClick={() => handleToggle(item)}>
                          {item.is_active === false ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {filtered.length === 0 && editingId !== "new" && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">No work items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}