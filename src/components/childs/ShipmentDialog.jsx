import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ShipmentDialog({ open, onOpenChange, child, parentAssets, onShipment }) {
  const [newAsset, setNewAsset] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = () => {
    if (newAsset) {
      onShipment({ new_parent_asset_id: newAsset, details });
      setNewAsset("");
      setDetails("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Shipment for {child?.child_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded text-sm">
            <p><strong>From Asset:</strong> {parentAssets.find(a => a.id === child?.parent_asset_id)?.asset_name || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Move to Asset *</Label>
            <Select value={newAsset} onValueChange={setNewAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination asset" />
              </SelectTrigger>
              <SelectContent>
                {parentAssets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Shipment Details</Label>
            <Textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Add shipment notes..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">Create Shipment</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}