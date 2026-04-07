import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight, Upload, Download } from "lucide-react";
import ChildCatalogForm from "./ChildCatalogForm";

const SHELTER_TYPES = ["A1","A2","Refurbished","B","C1","C2","C3","D1","D2","Bicycle racks"];
const WARRANTY_START_RULES = [
  { value: "asset_delivery_date", label: "Asset Delivery Date" },
  { value: "child_installation_date", label: "Child Installation Date" },
  { value: "manual", label: "Manual" },
];

// ── Child Catalog Tab ──────────────────────────────────────────────
function ChildCatalogTab({ catalog, queryClient }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.ChildCatalog.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["childCatalog"] }); setAdding(false); setForm({}); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChildCatalog.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["childCatalog"] }); setEditing(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChildCatalog.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["childCatalog"] })
  });



  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">{catalog.length} child components defined</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
            const csv = ["child_code,child_name,child_category,child_type,default_warranty_months,warranty_start_rule",
              ...catalog.map(c => `${c.child_code},${c.child_name},${c.child_category || ""},${c.child_type || ""},${c.default_warranty_months || ""},${c.warranty_start_rule || ""}`)].join("\n");
            const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "child_catalog.csv"; a.click();
          }}><Download className="w-3 h-3" />Export CSV</Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs gap-1" onClick={() => { setAdding(true); setForm({ warranty_start_rule: "asset_delivery_date", active: true, pricing_type: "Individual" }); }}>
            <Plus className="w-3 h-3" />Add Child
          </Button>
        </div>
      </div>

      {adding && <ChildCatalogForm value={form} onChange={setForm} onSave={() => {
        const dataToSave = { ...form };
        if (form.pricing_type === "Bundle" && form.bundle_items?.length > 0 && !form.child_name?.trim()) {
          const codes = form.bundle_items.map(item => item.child_code).join(",");
          dataToSave.child_name = `bundled ${codes}`;
        }
        createMutation.mutate(dataToSave);
      }} onCancel={() => { setAdding(false); setForm({}); }} saving={createMutation.isPending} />}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              {["Code","Name","Category","Type","Pricing","Bundle","Price (€)","Warranty","Start Rule","Active",""].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {catalog.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">No children defined yet</td></tr>}
            {catalog.map(item => (
              <tr key={item.id} className={`hover:bg-slate-50 ${!item.active ? "opacity-50" : ""}`}>
                {editing?.id === item.id ? (
                  <td colSpan={10} className="p-2">
                   <ChildCatalogForm value={editing} onChange={setEditing}
                     onSave={() => {
                       const dataToSave = { ...editing };
                       if (editing.pricing_type === "Bundle" && editing.bundle_items?.length > 0 && !editing.child_name?.trim()) {
                         const codes = editing.bundle_items.map(bi => bi.child_code).join(",");
                         dataToSave.child_name = `bundled ${codes}`;
                       }
                       updateMutation.mutate({ id: item.id, data: dataToSave });
                     }}
                     onCancel={() => setEditing(null)} saving={updateMutation.isPending} />
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2 font-mono text-slate-700">{item.child_code}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{item.child_name}</td>
                    <td className="px-3 py-2 text-slate-600">{item.child_category}</td>
                    <td className="px-3 py-2 text-slate-600">{item.child_type}</td>
                    <td className="px-3 py-2 text-xs"><Badge variant="outline">{item.pricing_type || "Individual"}</Badge></td>
                    <td className="px-3 py-2 font-mono text-slate-500 text-xs">
                      {item.pricing_type === "Bundle" && item.bundle_items?.length > 0
                        ? item.bundle_items.map(bi => bi.child_code || bi.child_name).join(",")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{item.pricing_type === "Bundle" ? `€${item.bundle_price?.toLocaleString()}` : item.unit_price != null ? `€${item.unit_price.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2">{item.default_warranty_months} mo</td>
                    <td className="px-3 py-2 text-slate-500">{WARRANTY_START_RULES.find(r => r.value === item.warranty_start_rule)?.label || item.warranty_start_rule}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => updateMutation.mutate({ id: item.id, data: { active: !item.active } })}>
                        {item.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing({ ...item })}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shelter Types Tab ──────────────────────────────────────────────
function ShelterTypesTab({ shelterTypeDefs, queryClient }) {
  const [editing, setEditing] = useState(null);
  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.ShelterTypeDefinitions.create(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shelterTypeDefs"] })
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShelterTypeDefinitions.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shelterTypeDefs"] }); setEditing(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShelterTypeDefinitions.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shelterTypeDefs"] })
  });

  const existingCodes = new Set(shelterTypeDefs.map(s => s.shelter_type_code));
  const missing = SHELTER_TYPES.filter(t => !existingCodes.has(t));

  return (
    <div className="space-y-3">
      {missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-medium mb-2">Missing shelter types — click to create:</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map(t => (
              <Button key={t} size="sm" variant="outline" className="h-6 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => createMutation.mutate({ shelter_type_code: t, shelter_type_name: t, active: true })}>
                <Plus className="w-3 h-3 mr-1" />{t}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>{["Code","Name","Active",""].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shelterTypeDefs.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No shelter types defined. Use the buttons above to create them.</td></tr>}
            {shelterTypeDefs.map(s => (
              <tr key={s.id} className={`hover:bg-slate-50 ${!s.active ? "opacity-50" : ""}`}>
                {editing?.id === s.id ? (
                  <td colSpan={4} className="p-2">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Code</Label>
                          <Input className="mt-1 h-8 text-xs" value={editing.shelter_type_code} onChange={(e) => setEditing({ ...editing, shelter_type_code: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Name</Label>
                          <Input className="mt-1 h-8 text-xs" value={editing.shelter_type_name} onChange={(e) => setEditing({ ...editing, shelter_type_name: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs" onClick={() => updateMutation.mutate({ id: s.id, data: editing })} disabled={updateMutation.isPending}>
                          <Check className="w-3 h-3 mr-1" />Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>
                          <X className="w-3 h-3 mr-1" />Cancel
                        </Button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-700">{s.shelter_type_code}</td>
                    <td className="px-3 py-2 text-slate-700">{s.shelter_type_name}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => updateMutation.mutate({ id: s.id, data: { active: !s.active } })}>
                        {s.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing({ ...s })}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Type Templates Tab ─────────────────────────────────────────────
function TypeTemplatesTab({ templates, catalog, shelterTypeDefs, queryClient }) {
  const [selectedType, setSelectedType] = useState(shelterTypeDefs[0]?.shelter_type_code || SHELTER_TYPES[0]);
  const [addForm, setAddForm] = useState({ child_catalog_id: "", default_included: true, mandatory: false, display_order: 0, active: true });
  const [adding, setAdding] = useState(false);

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.TypeTemplates.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["typeTemplates"] }); setAdding(false); setAddForm({ child_catalog_id: "", default_included: true, mandatory: false, display_order: 0, active: true }); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TypeTemplates.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["typeTemplates"] })
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TypeTemplates.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["typeTemplates"] })
  });

  const typeRows = templates.filter(t => t.shelter_type_code === selectedType).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const availableTypes = shelterTypeDefs.length ? shelterTypeDefs.map(s => s.shelter_type_code) : SHELTER_TYPES;
  const usedChildIds = new Set(typeRows.map(r => r.child_catalog_id));

  const autoPopulate = () => {
    const matchingChildren = catalog.filter(c => c.active && c.child_type === selectedType && !usedChildIds.has(c.id));
    matchingChildren.forEach((child, idx) => {
      createMutation.mutate({ 
        shelter_type_code: selectedType, 
        child_catalog_id: child.id, 
        default_included: true, 
        mandatory: false, 
        display_order: (typeRows.length || 0) + idx, 
        active: true 
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-xs shrink-0">Shelter Type:</Label>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{availableTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{typeRows.length} children</Badge>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={autoPopulate} disabled={catalog.filter(c => c.active && c.child_type === selectedType && !usedChildIds.has(c.id)).length === 0}>
          Auto-populate
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>{["#","Child Component","Category","Warranty","Default","Mandatory","Active",""].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {typeRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No children mapped to this shelter type</td></tr>}
            {typeRows.map(row => {
              const child = catalog.find(c => c.id === row.child_catalog_id);
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{row.display_order}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{child?.child_name || <span className="text-red-400">Unknown</span>}</td>
                  <td className="px-3 py-2 text-slate-500">{child?.child_category}</td>
                  <td className="px-3 py-2">{child?.default_warranty_months} mo</td>
                  <td className="px-3 py-2">
                    <button onClick={() => updateMutation.mutate({ id: row.id, data: { default_included: !row.default_included } })}>
                      {row.default_included ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => updateMutation.mutate({ id: row.id, data: { mandatory: !row.mandatory } })}>
                      {row.mandatory ? <Badge className="text-[10px] h-5 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Yes</Badge> : <Badge variant="outline" className="text-[10px] h-5">No</Badge>}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => updateMutation.mutate({ id: row.id, data: { active: !row.active } })}>
                      {row.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="w-3 h-3" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-indigo-700">Add child to {selectedType}</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Child Component *</Label>
              <Select value={addForm.child_catalog_id} onValueChange={v => setAddForm(f => ({ ...f, child_catalog_id: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{catalog.filter(c => c.active && !usedChildIds.has(c.id)).map(c => <SelectItem key={c.id} value={c.id}>{c.child_name} ({c.child_category})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Order</Label><Input type="number" className="mt-1 h-8 text-xs" value={addForm.display_order} onChange={e => setAddForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={addForm.default_included} onChange={e => setAddForm(f => ({ ...f, default_included: e.target.checked }))} />Default included</label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={addForm.mandatory} onChange={e => setAddForm(f => ({ ...f, mandatory: e.target.checked }))} />Mandatory</label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs" disabled={!addForm.child_catalog_id || createMutation.isPending}
              onClick={() => createMutation.mutate({ ...addForm, shelter_type_code: selectedType })}>
              <Check className="w-3 h-3 mr-1" />Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}><X className="w-3 h-3 mr-1" />Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs gap-1" onClick={() => setAdding(true)} disabled={catalog.filter(c => c.active).length === 0}>
          <Plus className="w-3 h-3" />Add Child to {selectedType}
        </Button>
      )}
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────
export default function ChildLogicConfig() {
  const queryClient = useQueryClient();

  const { data: catalog = [] } = useQuery({ queryKey: ["childCatalog"], queryFn: () => base44.entities.ChildCatalog.list() });
  const { data: shelterTypeDefs = [] } = useQuery({ queryKey: ["shelterTypeDefs"], queryFn: () => base44.entities.ShelterTypeDefinitions.list() });
  const { data: templates = [] } = useQuery({ queryKey: ["typeTemplates"], queryFn: () => base44.entities.TypeTemplates.list() });

  return (
    <Tabs defaultValue="catalog">
      <TabsList className="w-full">
        <TabsTrigger value="catalog" className="flex-1 text-xs">Child Catalog</TabsTrigger>
        <TabsTrigger value="shelter_types" className="flex-1 text-xs">Shelter Types</TabsTrigger>
        <TabsTrigger value="templates" className="flex-1 text-xs">Type Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="catalog" className="pt-4">
        <ChildCatalogTab catalog={catalog} queryClient={queryClient} />
      </TabsContent>
      <TabsContent value="shelter_types" className="pt-4">
        <ShelterTypesTab shelterTypeDefs={shelterTypeDefs} queryClient={queryClient} />
      </TabsContent>
      <TabsContent value="templates" className="pt-4">
        <TypeTemplatesTab templates={templates} catalog={catalog} shelterTypeDefs={shelterTypeDefs} queryClient={queryClient} />
      </TabsContent>
    </Tabs>
  );
}