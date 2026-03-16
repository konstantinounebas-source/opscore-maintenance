import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AssignChildDialog({ open, onOpenChange, child, parentAssets, onAssign, onShipment }) {
  const [selectedAsset, setSelectedAsset] = useState("");

  const handleAssign = () => {
    if (selectedAsset) {
      onAssign(selectedAsset);
      setSelectedAsset("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Child Asset: {child?.child_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded text-sm">
            <p><strong>Current Assignment:</strong> {child?.parent_asset_id ? parentAssets.find(a => a.id === child.parent_asset_id)?.asset_name : "Unassigned"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Assign to Asset ID</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {parentAssets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.asset_id} - {a.asset_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { onOpenChange(false); onShipment(); }}>Create Shipment</Button>
            <Button onClick={handleAssign} className="bg-indigo-600 hover:bg-indigo-700">Assign</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}