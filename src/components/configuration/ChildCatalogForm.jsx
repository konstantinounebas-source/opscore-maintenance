import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Plus, Trash2 } from "lucide-react";

const WARRANTY_START_RULES = [
  { value: "asset_delivery_date", label: "Asset Delivery Date" },
  { value: "child_installation_date", label: "Child Installation Date" },
  { value: "manual", label: "Manual" },
];

const ChildCatalogForm = memo(function ChildCatalogForm({ value, onChange, onSave, onCancel, saving }) {
  const pricingType = value.pricing_type || "Individual";
  const isBundle = pricingType === "Bundle";
  const bundleItems = value.bundle_items || [];
  const [newBundleItem, setNewBundleItem] = useState({ child_name: "", child_code: "", child_category: "", child_type: "", unit_price: "" });

  const addBundleItem = () => {
    if (newBundleItem.child_name?.trim()) {
      onChange({ 
        ...value, 
        bundle_items: [...bundleItems, newBundleItem] 
      });
      setNewBundleItem({ child_name: "", child_code: "", child_category: "", child_type: "", unit_price: "" });
    }
  };

  const removeBundleItem = (idx) => {
    onChange({ 
      ...value, 
      bundle_items: bundleItems.filter((_, i) => i !== idx) 
    });
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Code</Label>
          <Input
            className="mt-1 h-8 text-xs"
            value={value.child_code || ""}
            onChange={(e) => onChange({ ...value, child_code: e.target.value })}
            placeholder="e.g. GLS-REAR"
          />
        </div>
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            className="mt-1 h-8 text-xs"
            value={value.child_name || ""}
            onChange={(e) => onChange({ ...value, child_name: e.target.value })}
            placeholder="e.g. Rear Glass Panel"
          />
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Input
            className="mt-1 h-8 text-xs"
            value={value.child_category || ""}
            onChange={(e) => onChange({ ...value, child_category: e.target.value })}
            placeholder="Glass, Seating, Lighting..."
          />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Input
            className="mt-1 h-8 text-xs"
            value={value.child_type || ""}
            onChange={(e) => onChange({ ...value, child_type: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Serial Number</Label>
          <Input
            className="mt-1 h-8 text-xs"
            value={value.serial_number || ""}
            onChange={(e) => onChange({ ...value, serial_number: e.target.value })}
            placeholder="e.g. SN-001"
          />
        </div>
        <div>
          <Label className="text-xs">Warranty (months)</Label>
          <Input
            type="number"
            className="mt-1 h-8 text-xs"
            value={value.default_warranty_months || ""}
            onChange={(e) => onChange({ ...value, default_warranty_months: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Warranty Start Rule</Label>
          <Select value={value.warranty_start_rule || "asset_delivery_date"} onValueChange={(v) => onChange({ ...value, warranty_start_rule: v })}>
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WARRANTY_START_RULES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pricing Type</Label>
          <Select value={pricingType} onValueChange={(v) => onChange({ ...value, pricing_type: v, bundle_items: v === "Bundle" ? [] : undefined })}>
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Individual">Individual</SelectItem>
              <SelectItem value="Bundle">Bundle</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      {isBundle && (
        <div className="border-t border-indigo-200 pt-3 space-y-3">
          <p className="text-xs font-semibold text-indigo-700">Bundle Items</p>
          
          {/* Add new bundle item */}
          <div className="border border-indigo-300 bg-white rounded-lg p-2 space-y-2">
            <div className="grid grid-cols-6 gap-2">
              <div>
                <Label className="text-xs">Code</Label>
                <Input
                  type="text"
                  className="mt-1 h-7 text-xs"
                  value={newBundleItem.child_code}
                  onChange={(e) => setNewBundleItem({ ...newBundleItem, child_code: e.target.value })}
                  placeholder="Code"
                />
              </div>
              <div>
                <Label className="text-xs">Name *</Label>
                <Input
                  type="text"
                  className="mt-1 h-7 text-xs"
                  value={newBundleItem.child_name}
                  onChange={(e) => setNewBundleItem({ ...newBundleItem, child_name: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input
                  type="text"
                  className="mt-1 h-7 text-xs"
                  value={newBundleItem.child_category}
                  onChange={(e) => setNewBundleItem({ ...newBundleItem, child_category: e.target.value })}
                  placeholder="Category"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Input
                  type="text"
                  className="mt-1 h-7 text-xs"
                  value={newBundleItem.child_type}
                  onChange={(e) => setNewBundleItem({ ...newBundleItem, child_type: e.target.value })}
                  placeholder="Type"
                />
              </div>
              <div>
                <Label className="text-xs">Price (€)</Label>
                <Input
                  type="number"
                  className="mt-1 h-7 text-xs"
                  value={newBundleItem.unit_price}
                  onChange={(e) => setNewBundleItem({ ...newBundleItem, unit_price: parseFloat(e.target.value) || "" })}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs w-full gap-1"
                  onClick={addBundleItem}
                  disabled={!newBundleItem.child_name?.trim()}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Listed bundle items */}
          {bundleItems.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {bundleItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-indigo-100 rounded px-2 py-1.5">
                  <div className="flex-1 flex gap-2 text-xs">
                    <span className="font-mono text-slate-600 w-16">{item.child_code}</span>
                    <span className="font-medium text-slate-800 flex-1">{item.child_name}</span>
                    <span className="text-slate-500">{item.child_category}</span>
                    <span className="text-slate-500">{item.child_type}</span>
                    <span className="font-mono text-slate-700 w-16 text-right">€{parseFloat(item.unit_price || 0).toFixed(2)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                    onClick={() => removeBundleItem(idx)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Bundle total price */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-200">
            <div>
              <Label className="text-xs">Bundle Total Price (€) *</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-xs"
                value={value.bundle_price || ""}
                onChange={(e) => onChange({ ...value, bundle_price: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs" 
          onClick={onSave} 
          disabled={saving || !value.child_name?.trim() || (isBundle && (!bundleItems.length || !value.bundle_price || isNaN(parseFloat(value.bundle_price))))}
        >
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
});

export default ChildCatalogForm;