import React, { memo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Trash2, Pencil, Wand2, AlertCircle } from "lucide-react";

const WARRANTY_START_RULES = [
  { value: "asset_delivery_date", label: "Asset Delivery Date" },
  { value: "child_installation_date", label: "Child Installation Date" },
  { value: "manual", label: "Manual" },
];

const GENERIC_NAME_BLOCKLIST = [
  "bundle", "item", "items", "set", "package", "group",
  "mixed bundle", "new bundle", "mixed", "component", "part",
];

function isGenericName(name) {
  if (!name) return true;
  return GENERIC_NAME_BLOCKLIST.includes(name.trim().toLowerCase());
}

function generateBundleNameSuggestions(bundleItems) {
  if (!bundleItems || bundleItems.length === 0) return [];

  const names = bundleItems.map(i => i.child_name).filter(Boolean);
  const categories = bundleItems.map(i => i.child_category).filter(Boolean);
  const types = bundleItems.map(i => i.child_type).filter(Boolean);

  const uniqueCategories = [...new Set(categories)];
  const uniqueTypes = [...new Set(types)];
  const suggestions = new Set();

  // RULE A: Mostly one category
  if (uniqueCategories.length === 1) {
    const cat = uniqueCategories[0];
    suggestions.add(`${cat} Assembly`);
    suggestions.add(`${cat} Kit`);
    suggestions.add(`${cat} Unit`);
  } else if (uniqueCategories.length > 1) {
    // RULE C: Mixed categories
    const firstCat = uniqueCategories[0];
    suggestions.add(`${firstCat} & Components Pack`);
    suggestions.add(`${firstCat} System`);
    suggestions.add(`Shelter ${uniqueCategories[0]} Pack`);
  }

  // RULE B: 2 clearly linked major items by name
  if (names.length >= 2) {
    const shortName1 = names[0].split(" ").slice(0, 2).join(" ");
    const shortName2 = names[1].split(" ").slice(0, 2).join(" ");
    suggestions.add(`${shortName1} & ${shortName2} Assembly`);
    suggestions.add(`${shortName1} & ${shortName2} Kit`);
  }

  // Type-based suggestion
  if (uniqueTypes.length === 1) {
    suggestions.add(`${uniqueTypes[0]} Kit`);
  }

  return [...suggestions].slice(0, 3);
}

const ChildCatalogForm = memo(function ChildCatalogForm({ value, onChange, onSave, onCancel, saving, allCatalog = [] }) {
  const { data: configLists = [] } = useQuery({
    queryKey: ["configLists"],
    queryFn: () => base44.entities.ConfigLists.list(),
  });

  const configCategories = configLists.filter(c => c.list_type === "child_category" && c.is_active).map(c => c.value);
  const configTypes = configLists.filter(c => c.list_type === "child_type" && c.is_active).map(c => c.value);
  const existingCategories = [...new Set(allCatalog.map(c => c.child_category).filter(Boolean))];
  const existingTypes = [...new Set(allCatalog.map(c => c.child_type).filter(Boolean))];
  const categories = [...new Set([...configCategories, ...existingCategories])].sort();
  const types = [...new Set([...configTypes, ...existingTypes])].sort();

  const pricingType = value.pricing_type || "Individual";
  const isBundle = pricingType === "Bundle";
  const bundleItems = value.bundle_items || [];

  const [newBundleItem, setNewBundleItem] = useState({ child_name: "", child_code: "", child_category: "", child_type: "", unit_price: "" });
  const [editingIndex, setEditingIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [errors, setErrors] = useState({});

  // Auto-generate suggestions when bundle items change
  useEffect(() => {
    if (isBundle && bundleItems.length > 0) {
      setSuggestions(generateBundleNameSuggestions(bundleItems));
    } else {
      setSuggestions([]);
    }
  }, [bundleItems, isBundle]);

  const validate = () => {
    const errs = {};
    if (!value.child_name?.trim()) {
      errs.child_name = "Name is required.";
    } else if (isBundle && isGenericName(value.child_name)) {
      errs.child_name = "Please provide a descriptive bundle name, e.g. 'Glass Panel & Frame Assembly' instead of 'Bundle'.";
    }
    if (isBundle && !value.child_code?.trim()) {
      errs.child_code = "Code is required for bundles.";
    }
    if (isBundle && bundleItems.length === 0) {
      errs.bundle_items = "At least one bundle item is required.";
    }
    if (isBundle && (!value.bundle_price || value.bundle_price <= 0)) {
      errs.bundle_price = "Bundle price must be greater than 0.";
    }
    if (!isBundle && !value.unit_price && value.unit_price !== 0) {
      // unit_price is optional for individuals — no error
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave();
  };

  const addBundleItem = () => {
    if (newBundleItem.child_name?.trim()) {
      if (editingIndex !== null) {
        const updated = [...bundleItems];
        updated[editingIndex] = newBundleItem;
        onChange({ ...value, bundle_items: updated });
        setEditingIndex(null);
      } else {
        onChange({ ...value, bundle_items: [...bundleItems, newBundleItem] });
      }
      setNewBundleItem({ child_name: "", child_code: "", child_category: "", child_type: "", unit_price: "" });
    }
  };

  const removeBundleItem = (idx) => {
    onChange({ ...value, bundle_items: bundleItems.filter((_, i) => i !== idx) });
  };

  const editBundleItem = (idx) => {
    setNewBundleItem(bundleItems[idx]);
    setEditingIndex(idx);
  };

  const cancelEdit = () => {
    setNewBundleItem({ child_name: "", child_code: "", child_category: "", child_type: "", unit_price: "" });
    setEditingIndex(null);
  };

  const applySuggestion = (suggestion) => {
    onChange({ ...value, child_name: suggestion, display_name: suggestion });
    setErrors(e => ({ ...e, child_name: undefined }));
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      {/* Pricing Type selector first so the form adapts */}
      <div className="flex items-center gap-3 pb-1 border-b border-indigo-200">
        <Label className="text-xs shrink-0">Pricing Type</Label>
        <Select
          value={pricingType}
          onValueChange={(v) => onChange({ ...value, pricing_type: v, bundle_items: v === "Bundle" ? (value.bundle_items || []) : undefined, bundle_price: v === "Bundle" ? value.bundle_price : undefined })}
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Individual">Individual</SelectItem>
            <SelectItem value="Bundle">Bundle</SelectItem>
          </SelectContent>
        </Select>
        {isBundle && <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs">Bundle Mode</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Name */}
        <div className="col-span-2">
          <Label className="text-xs">Name {isBundle ? "(Descriptive) *" : "*"}</Label>
          <Input
            className={`mt-1 h-8 text-xs ${errors.child_name ? "border-red-400" : ""}`}
            value={value.child_name || ""}
            onChange={(e) => {
              onChange({ ...value, child_name: e.target.value });
              if (errors.child_name) setErrors(e2 => ({ ...e2, child_name: undefined }));
            }}
            placeholder={isBundle ? "e.g. Glass Panel & Frame Assembly" : "e.g. Rear Glass Panel"}
          />
          {errors.child_name && (
            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.child_name}
            </p>
          )}
          {/* Name suggestions for bundles */}
          {isBundle && suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-indigo-500 flex items-center gap-0.5"><Wand2 className="w-3 h-3" />Suggestions:</span>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Code */}
        <div>
          <Label className="text-xs">Code {isBundle ? "*" : ""}</Label>
          <Input
            className={`mt-1 h-8 text-xs ${errors.child_code ? "border-red-400" : ""}`}
            value={value.child_code || ""}
            onChange={(e) => {
              onChange({ ...value, child_code: e.target.value });
              if (errors.child_code) setErrors(e2 => ({ ...e2, child_code: undefined }));
            }}
            placeholder={isBundle ? "e.g. BND-GLS-001" : "e.g. CHD-001"}
          />
          {errors.child_code && (
            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.child_code}
            </p>
          )}
        </div>

        {/* Display Name (only for bundles) */}
        {isBundle && (
          <div className="col-span-2">
            <Label className="text-xs">Display Name <span className="text-slate-400">(optional — shown in forms & reports)</span></Label>
            <Input
              className="mt-1 h-8 text-xs"
              value={value.display_name || ""}
              onChange={(e) => onChange({ ...value, display_name: e.target.value })}
              placeholder="Commercial/user-facing name (defaults to Name if empty)"
            />
          </div>
        )}

        {/* Category */}
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={value.child_category || ""} onValueChange={(v) => onChange({ ...value, child_category: v })}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger>
            <SelectContent>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={value.child_type || ""} onValueChange={(v) => onChange({ ...value, child_type: v })}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger>
            <SelectContent>
              {types.map(typ => <SelectItem key={typ} value={typ}>{typ}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Serial Number */}
        <div>
          <Label className="text-xs">Serial Number</Label>
          <Input
            className="mt-1 h-8 text-xs"
            value={value.serial_number || ""}
            onChange={(e) => onChange({ ...value, serial_number: e.target.value })}
            placeholder="e.g. SN-001"
          />
        </div>

        {/* Warranty months */}
        <div>
          <Label className="text-xs">Warranty (months)</Label>
          <Input
            type="number"
            className="mt-1 h-8 text-xs"
            value={value.default_warranty_months || ""}
            onChange={(e) => onChange({ ...value, default_warranty_months: parseInt(e.target.value) })}
          />
        </div>

        {/* Warranty start rule */}
        <div>
          <Label className="text-xs">Warranty Start Rule</Label>
          <Select value={value.warranty_start_rule || "asset_delivery_date"} onValueChange={(v) => onChange({ ...value, warranty_start_rule: v })}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WARRANTY_START_RULES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unit price — only for Individual */}
        {!isBundle && (
          <div>
            <Label className="text-xs">Unit Price (€)</Label>
            <Input
              type="number"
              className="mt-1 h-8 text-xs"
              value={value.unit_price || ""}
              onChange={(e) => onChange({ ...value, unit_price: parseFloat(e.target.value) || undefined })}
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* Bundle section */}
      {isBundle && (
        <div className="border-t border-indigo-200 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-700">Bundle Items</p>
            {bundleItems.length > 0 && (
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200">
                {bundleItems.length} item{bundleItems.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {errors.bundle_items && (
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.bundle_items}
            </p>
          )}

          {/* Add bundle item row */}
          <div className="border border-indigo-300 bg-white rounded-lg p-2 space-y-2">
            <div className="grid grid-cols-6 gap-2">
              <div>
                <Label className="text-xs">Code</Label>
                <Input type="text" className="mt-1 h-7 text-xs" value={newBundleItem.child_code} onChange={(e) => setNewBundleItem({ ...newBundleItem, child_code: e.target.value })} placeholder="Code" />
              </div>
              <div>
                <Label className="text-xs">Name *</Label>
                <Input type="text" className="mt-1 h-7 text-xs" value={newBundleItem.child_name} onChange={(e) => setNewBundleItem({ ...newBundleItem, child_name: e.target.value })} placeholder="Name" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={newBundleItem.child_category || ""} onValueChange={(v) => setNewBundleItem({ ...newBundleItem, child_category: v })}>
                  <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newBundleItem.child_type || ""} onValueChange={(v) => setNewBundleItem({ ...newBundleItem, child_type: v })}>
                  <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>{types.map(typ => <SelectItem key={typ} value={typ}>{typ}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Price (€)</Label>
                <Input type="number" className="mt-1 h-7 text-xs" value={newBundleItem.unit_price || ""} onChange={(e) => setNewBundleItem({ ...newBundleItem, unit_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0.00" />
              </div>
              <div className="flex items-end gap-1">
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={addBundleItem} disabled={!newBundleItem.child_name?.trim()}>
                  <Plus className="w-3 h-3" />
                  {editingIndex !== null ? "Update" : "Add"}
                </Button>
                {editingIndex !== null && (
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Listed bundle items */}
          {bundleItems.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {bundleItems.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between bg-white border rounded px-2 py-1.5 ${editingIndex === idx ? "border-indigo-400 bg-indigo-50" : "border-indigo-100"}`}>
                  <div className="flex-1 flex gap-2 text-xs">
                    <span className="font-mono text-slate-600 w-16">{item.child_code}</span>
                    <span className="font-medium text-slate-800 flex-1">{item.child_name}</span>
                    <span className="text-slate-500">{item.child_category}</span>
                    <span className="text-slate-500">{item.child_type}</span>
                    <span className="font-mono text-slate-700 w-16 text-right">€{parseFloat(item.unit_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-indigo-400 hover:text-indigo-600" onClick={() => editBundleItem(idx)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-600" onClick={() => removeBundleItem(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bundle total price */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-indigo-200">
            <div>
              <Label className="text-xs">Bundle Total Price (€) *</Label>
              <Input
                type="number"
                className={`mt-1 h-8 text-xs ${errors.bundle_price ? "border-red-400" : ""}`}
                value={value.bundle_price || ""}
                onChange={(e) => {
                  onChange({ ...value, bundle_price: parseFloat(e.target.value) || undefined });
                  if (errors.bundle_price) setErrors(e2 => ({ ...e2, bundle_price: undefined }));
                }}
                placeholder="0.00"
              />
              {errors.bundle_price && (
                <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.bundle_price}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs" onClick={handleSave} disabled={saving}>
          <Check className="w-3 h-3 mr-1" />Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
});

export default ChildCatalogForm;
export { isGenericName };