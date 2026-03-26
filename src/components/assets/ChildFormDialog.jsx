import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ConfirmCloseDialog from "@/components/shared/ConfirmCloseDialog";

export default function ChildFormDialog({ open, onOpenChange, child, parentAssetId, onSave }) {
  const { data: catalog = [] } = useQuery({
    queryKey: ["childCatalog"],
    queryFn: () => base44.entities.ChildCatalog.list(),
  });

  const activeCatalog = catalog.filter(c => c.active !== false);

  const [form, setForm] = useState({
    child_id: "", category: "", serial_number: "", installation_date: "",
    child_type: "", description: "", unit_price: ""
  });
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (child) {
      setForm({
        child_id: child.child_id || "",
        category: child.category || "",
        serial_number: child.serial_number || "",
        installation_date: child.installation_date || "",
        child_type: child.child_type || "",
        description: child.description || "",
        unit_price: child.unit_price || "",
      });
      setSelectedCatalogId("");
    } else {
      setForm({ child_id: "", category: "", serial_number: "", installation_date: "", child_type: "", description: "", unit_price: "" });
      setSelectedCatalogId("");
    }
  }, [child, open]);

  const handleCatalogSelect = (catalogId) => {
    setSelectedCatalogId(catalogId);
    const entry = activeCatalog.find(c => c.id === catalogId);
    if (entry) {
      setForm(f => ({
        ...f,
        child_id: entry.child_code,
        category: entry.child_category || "",
        child_type: entry.child_type || "",
        serial_number: entry.serial_number || "",
        unit_price: entry.unit_price != null ? entry.unit_price : "",
        description: entry.child_name || "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      parent_asset_id: parentAssetId,
      unit_price: form.unit_price !== "" ? parseFloat(form.unit_price) : undefined,
    });
  };

  return (
    <>
      <ConfirmCloseDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); onOpenChange(false); }}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={e => { e.preventDefault(); setConfirmClose(true); }}>
          <DialogHeader>
            <DialogTitle>{child ? "Edit Child" : "Add Child"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* Child Component selector (from catalog) */}
            {!child && (
              <div className="space-y-1.5">
                <Label className="text-xs">Child Component (from Catalog) *</Label>
                <Select value={selectedCatalogId} onValueChange={handleCatalogSelect} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child component..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCatalog.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.child_name} — {c.child_code} {c.child_category ? `(${c.child_category})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Auto-filled fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Child ID / Code</Label>
                <Input value={form.child_id} readOnly className="bg-slate-50 text-slate-600" placeholder="Auto-filled from catalog" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input value={form.category} readOnly className="bg-slate-50 text-slate-600" placeholder="Auto-filled" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Input value={form.child_type} readOnly className="bg-slate-50 text-slate-600" placeholder="Auto-filled" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Price (€)</Label>
                <Input value={form.unit_price} readOnly className="bg-slate-50 text-slate-600" placeholder="Auto-filled" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={form.description} readOnly className="bg-slate-50 text-slate-600" placeholder="Auto-filled" />
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Serial Number</Label>
                <Input
                  value={form.serial_number}
                  onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                  placeholder="Enter serial number..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Installation Date</Label>
                <Input
                  type="date"
                  value={form.installation_date}
                  onChange={e => setForm(f => ({ ...f, installation_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmClose(true)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!child && !selectedCatalogId}
              >
                {child ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}