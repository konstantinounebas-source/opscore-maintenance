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

const SHELTER_TYPES = ["A1","A2","Refurbished","B","C","C1","C2","C3","D1","D2","Bicycle racks"];
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
  const [filterType, setFilterType] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState({});

  const uniqueTypes = [...new Set(catalog.map(c => c.child_type).filter(Boolean))].sort();

  const filtered = (filterType === "all" ? catalog : catalog.filter(c => c.child_type === filterType))
    .filter(c => c.child_code !== "Others" && c.child_name !== "Others");

  // Group by category, excluding "Others" and "Uncategorized"
  const groupedByCategory = filtered.reduce((acc, item) => {
    const cat = item.child_category || "Uncategorized";
    if (cat === "Others" || cat === "Uncategorized") return acc;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const toggleCategory = (cat) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const isCatExpanded = (cat) => expandedCategories[cat] !== false; // default expanded

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

  const formatPrice = (item) => {
    const p = item.pricing_type === "Bundle" ? item.bundle_price : item.unit_price;
    return p != null ? `€${Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{filtered.length} of {catalog.length} items</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Shelter Type:</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs gap-1" onClick={() => { setAdding(true); setForm({ warranty_start_rule: "asset_delivery_date", active: true, pricing_type: "Individual" }); }}>
          <Plus className="w-3 h-3" />Add Child
        </Button>
      </div>

      {adding && (
        <ChildCatalogForm value={form} onChange={setForm} allCatalog={catalog}
          onCancel={() => { setAdding(false); setForm({}); }}
          onSave={() => createMutation.mutate(form)}
          saving={createMutation.isPending} />
      )}

      {/* Excel-style grouped table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              {["No.", "Shelter Type", "Type", "Description", "Total Price", "Active", ""].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No children defined yet. Import from Excel or add manually.</td></tr>
            )}
            {Object.entries(groupedByCategory).map(([category, items]) => (
              <React.Fragment key={category}>
                {/* Category header row */}
                <tr
                  className="bg-slate-100 cursor-pointer hover:bg-slate-200 select-none"
                  onClick={() => toggleCategory(category)}
                >
                  <td colSpan={7} className="px-3 py-1.5 font-bold text-slate-700 text-xs uppercase tracking-wide">
                    <span className="mr-2 text-slate-400">{isCatExpanded(category) ? "▼" : "▶"}</span>
                    {category}
                    <span className="ml-2 text-slate-400 font-normal normal-case tracking-normal">({items.length})</span>
                  </td>
                </tr>
                {isCatExpanded(category) && items.map(item => (
                  <React.Fragment key={item.id}>
                    {editing?.id === item.id ? (
                      <tr>
                        <td colSpan={7} className="p-2 bg-indigo-50">
                          <ChildCatalogForm value={editing} onChange={setEditing} allCatalog={catalog}
                            onCancel={() => setEditing(null)}
                            onSave={() => updateMutation.mutate({ id: item.id, data: editing })}
                            saving={updateMutation.isPending} />
                        </td>
                      </tr>
                    ) : (
                      <tr className={`hover:bg-slate-50 border-b border-slate-100 ${!item.active ? "opacity-40" : ""}`}>
                        <td className="px-3 py-1.5 font-mono text-slate-600 text-xs w-16">{item.child_code || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-600 text-xs w-24">{item.child_type || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-500 text-xs w-40 max-w-[160px] truncate" title={item.display_name}>{item.display_name || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-800 text-xs">
                          <div>{item.child_name}</div>
                          {item.pricing_type === "Bundle" && <Badge className="mt-0.5 text-[10px] bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-100">Bundle</Badge>}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-700 text-xs font-medium w-28">{formatPrice(item)}</td>
                        <td className="px-3 py-1.5 w-12">
                          <button onClick={() => updateMutation.mutate({ id: item.id, data: { active: !item.active } })}>
                            {item.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-3 py-1.5 w-16">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing({ ...item })}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </React.Fragment>
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

  const typeRows = templates
    .filter(t => t.shelter_type_code === selectedType)
    .filter(t => {
      const child = catalog.find(c => c.id === t.child_catalog_id);
      return child?.child_code !== "Others" && child?.child_name !== "Others";
    })
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const availableTypes = shelterTypeDefs.length ? shelterTypeDefs.map(s => s.shelter_type_code) : SHELTER_TYPES;
  const usedChildIds = new Set(typeRows.map(r => r.child_catalog_id));

  const matchingChildren = catalog.filter(c => {
    if (!c.active) return false;
    const ct = (c.child_type || '').trim().toUpperCase();
    const st = selectedType.toUpperCase();
    if (ct === st) return true;
    if (ct === 'C1/C2' && (st === 'C1' || st === 'C2')) return true;
    if (ct.length === 1 && st.startsWith(ct)) return true;
    return false;
  });

  const autoPopulate = () => {
    const toAdd = matchingChildren.filter(c => !usedChildIds.has(c.id));
    toAdd.forEach((child, idx) => {
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

  const [isResetting, setIsResetting] = useState(false);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const resetAndPopulate = async () => {
    setIsResetting(true);
    // Delete one by one with 400ms gap to stay under rate limit
    for (let i = 0; i < typeRows.length; i++) {
      await base44.entities.TypeTemplates.delete(typeRows[i].id);
      await sleep(400);
    }
    await queryClient.invalidateQueries({ queryKey: ["typeTemplates"] });
    // Create one by one with 400ms gap
    for (let idx = 0; idx < matchingChildren.length; idx++) {
      await base44.entities.TypeTemplates.create({
        shelter_type_code: selectedType,
        child_catalog_id: matchingChildren[idx].id,
        default_included: true,
        mandatory: false,
        display_order: idx,
        active: true,
      });
      await sleep(400);
    }
    await queryClient.invalidateQueries({ queryKey: ["typeTemplates"] });
    setIsResetting(false);
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
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={autoPopulate} disabled={matchingChildren.filter(c => !usedChildIds.has(c.id)).length === 0}>
          Auto-populate
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={resetAndPopulate} disabled={matchingChildren.length === 0 || isResetting}>
          {isResetting ? "Resetting..." : "Reset & Re-populate"}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              {["No.", "Shelter Type", "Type", "Description", "Total Price", "Default", "Mandatory", "Active", ""].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {typeRows.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">No children mapped to this shelter type. Use Auto-populate or Reset &amp; Re-populate.</td></tr>}
            {(() => {
              // Group by category for Excel-style layout, excluding "Others" and "Uncategorized"
              const grouped = typeRows.reduce((acc, row) => {
                const child = catalog.find(c => c.id === row.child_catalog_id);
                const cat = child?.child_category || "Uncategorized";
                if (cat === "Others" || cat === "Uncategorized") return acc;
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push({ row, child });
                return acc;
              }, {});
              return Object.entries(grouped).map(([cat, entries]) => (
                <React.Fragment key={cat}>
                  <tr className="bg-slate-100">
                    <td colSpan={9} className="px-3 py-1.5 font-bold text-slate-700 text-xs uppercase tracking-wide">
                      {cat}
                      <span className="ml-2 text-slate-400 font-normal normal-case tracking-normal">({entries.length})</span>
                    </td>
                  </tr>
                  {entries.map(({ row, child }) => {
                    const price = child?.pricing_type === "Bundle" ? child?.bundle_price : child?.unit_price;
                    const priceStr = price != null ? `€${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50 border-b border-slate-100 ${!row.active ? "opacity-40" : ""}`}>
                        <td className="px-3 py-1.5 font-mono text-slate-600 text-xs w-16">{child?.child_code || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-600 text-xs w-24">{child?.child_type || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-500 text-xs w-40 max-w-[160px] truncate" title={child?.display_name}>{child?.display_name || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-800 text-xs">
                          {child ? child.child_name : <span className="text-red-400">Unknown</span>}
                          {child?.pricing_type === "Bundle" && <Badge className="ml-1 text-[10px] bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-100">Bundle</Badge>}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-700 text-xs font-medium w-28">{priceStr}</td>
                        <td className="px-3 py-1.5 w-14">
                          <button onClick={() => updateMutation.mutate({ id: row.id, data: { default_included: !row.default_included } })}>
                            {row.default_included ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-3 py-1.5 w-16">
                          <button onClick={() => updateMutation.mutate({ id: row.id, data: { mandatory: !row.mandatory } })}>
                            {row.mandatory ? <Badge className="text-[10px] h-5 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Yes</Badge> : <Badge variant="outline" className="text-[10px] h-5">No</Badge>}
                          </button>
                        </td>
                        <td className="px-3 py-1.5 w-12">
                          <button onClick={() => updateMutation.mutate({ id: row.id, data: { active: !row.active } })}>
                            {row.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-3 py-1.5 w-10">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="w-3 h-3" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ));
            })()}
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
                <SelectContent>{catalog.filter(c => c.active && !usedChildIds.has(c.id)).map(c => <SelectItem key={c.id} value={c.id}>{c.display_name || c.child_name} {c.pricing_type === "Bundle" ? "[Bundle]" : ""} ({c.child_category})</SelectItem>)}</SelectContent>
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

  const { data: catalog = [] } = useQuery({ queryKey: ["childCatalog"], queryFn: () => base44.entities.ChildCatalog.list('created_date', 1000) });
  const { data: shelterTypeDefs = [] } = useQuery({ queryKey: ["shelterTypeDefs"], queryFn: () => base44.entities.ShelterTypeDefinitions.list() });
  const { data: templates = [] } = useQuery({ queryKey: ["typeTemplates"], queryFn: () => base44.entities.TypeTemplates.list('created_date', 1000) });

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