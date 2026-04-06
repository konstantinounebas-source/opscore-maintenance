import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X } from "lucide-react";

const WARRANTY_START_RULES = [
  { value: "asset_delivery_date", label: "Asset Delivery Date" },
  { value: "child_installation_date", label: "Child Installation Date" },
  { value: "manual", label: "Manual" },
];

const ChildCatalogForm = memo(function ChildCatalogForm({ value, onChange, onSave, onCancel, saving }) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
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
          <Label className="text-xs">Unit Price (€)</Label>
          <Input
            type="number"
            className="mt-1 h-8 text-xs"
            value={value.unit_price || ""}
            onChange={(e) => onChange({ ...value, unit_price: parseFloat(e.target.value) || undefined })}
            placeholder="0.00"
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
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs" onClick={onSave} disabled={saving}>
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