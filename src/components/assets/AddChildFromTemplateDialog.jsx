import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

// Normalize "TYPE C1", "REFURBISHED - A2", "type-b" etc. → "C1", "A2", "B"
function normalizeShelterType(raw) {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  // Try to extract known type codes: A1, A2, B, C1, C2, C3, D1, D2, Refurbished
  const match = s.match(/\b(A1|A2|C1|C2|C3|D1|D2|B)\b/);
  if (match) return match[1];
  if (s.includes("REFURBISHED")) return "Refurbished";
  if (s.includes("BICYCLE") || s.includes("RACK")) return "Bicycle racks";
  // fallback: return as-is (trimmed)
  return raw.trim();
}

export default function AddChildFromTemplateDialog({ open, onOpenChange, asset, onSave }) {
  const rawShelterType = asset?.shelter_type || asset?.installed_shelter_type || asset?.ordered_shelter_type;
  const shelterType = normalizeShelterType(rawShelterType);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["typeTemplates", shelterType],
    queryFn: () => base44.entities.TypeTemplates.list('display_order', 1000),
    enabled: open && !!shelterType,
  });

  const { data: catalog = [], isLoading: loadingCatalog } = useQuery({
    queryKey: ["childCatalog"],
    queryFn: () => base44.entities.ChildCatalog.list('created_date', 1000),
    enabled: open,
  });

  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);

  // Build rows by joining templates with catalog, filtered to this shelter type
  const rows = templates
    .filter(t => t.shelter_type_code === shelterType && t.active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map(t => {
      const cat = catalog.find(c => c.id === t.child_catalog_id);
      return { template: t, cat };
    })
    .filter(r => r.cat);

  // Initialize checkboxes when rows load
  useEffect(() => {
    if (rows.length > 0) {
      const init = {};
      rows.forEach(r => { init[r.template.id] = r.template.default_included !== false; });
      setSelected(init);
    }
  }, [rows.length, shelterType]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) { setSelected({}); setSaving(false); }
  }, [open]);

  const toggle = (id, mandatory) => {
    if (mandatory) return;
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toCreate = rows.filter(r => selected[r.template.id]);
    for (const { cat } of toCreate) {
      await onSave({
        child_id: `${asset.asset_id || asset.id}-${cat.child_code || cat.id}-${Date.now()}`,
        parent_asset_id: asset.id,
        category: cat.child_category || "",
        child_type: cat.child_type || "",
        description: cat.child_name,
        serial_number: cat.serial_number || "",
        unit_price: cat.unit_price || 0,
      });
    }
    setSaving(false);
    onOpenChange(false);
  };

  const isLoading = loadingTemplates || loadingCatalog;
  const checkedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle>Add Children from Template</DialogTitle>
          {shelterType && (
            <p className="text-xs text-slate-500 mt-1">
              Shelter type: <span className="font-semibold text-slate-700">{shelterType}</span>
            </p>
          )}
        </DialogHeader>

        {!shelterType && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
            This asset has no Shelter Type set. Please edit the asset and set a Shelter Type first.
          </p>
        )}

        {shelterType && isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading template…</span>
          </div>
        )}

        {shelterType && !isLoading && rows.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            No template items found for shelter type "{shelterType}".
          </p>
        )}

        {shelterType && !isLoading && rows.length > 0 && (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {rows.map(({ template, cat }) => {
              const isMandatory = template.mandatory === true;
              const isChecked = !!selected[template.id];
              return (
                <div
                  key={template.id}
                  onClick={() => toggle(template.id, isMandatory)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer
                    ${isChecked ? "border-indigo-200 bg-indigo-50" : "border-slate-100 bg-white hover:bg-slate-50"}
                    ${isMandatory ? "opacity-80 cursor-not-allowed" : ""}`}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isMandatory}
                    onCheckedChange={() => toggle(template.id, isMandatory)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{cat.child_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[cat.child_category, cat.child_type].filter(Boolean).join(" · ")}
                      {cat.unit_price ? ` · €${cat.unit_price}` : ""}
                    </p>
                  </div>
                  {isMandatory && (
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Required</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!shelterType || isLoading || checkedCount === 0 || saving}
            onClick={handleSave}
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Adding…</> : `Add ${checkedCount} Child${checkedCount !== 1 ? "ren" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}