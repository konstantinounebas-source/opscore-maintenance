import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function MoveChildDialog({ open, onOpenChange, child, assets, currentAssetId, onMove }) {
  const [destination, setDestination] = useState("");

  const handleSubmit = () => {
    if (destination) {
      onMove(child, destination);
      setDestination("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Child Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">Child ID: <span className="font-semibold">{child?.child_id}</span></p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Move to:</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">← Return to Inventory (Unassigned)</SelectItem>
                <SelectItem disabled>━━ Assets ━━</SelectItem>
                {assets.filter(a => a.id !== currentAssetId).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.asset_name} ({a.asset_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { onOpenChange(false); setDestination(""); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!destination} className="bg-indigo-600 hover:bg-indigo-700">
              Move
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}