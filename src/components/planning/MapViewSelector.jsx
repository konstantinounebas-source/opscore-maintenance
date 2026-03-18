import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Plus, Loader2 } from "lucide-react";

export default function MapViewSelector({ mapViews, selectedViewId, onSelectView, filters, onSaveView, saving }) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDesc, setViewDesc] = useState("");
  const [viewType, setViewType] = useState("Custom");

  const handleSave = async () => {
    if (!viewName.trim()) return;
    await onSaveView({ name: viewName.trim(), description: viewDesc, view_type: viewType });
    setSaveOpen(false);
    setViewName("");
    setViewDesc("");
  };

  return (
    <div className="flex items-center gap-2">
      <Bookmark className="w-4 h-4 text-slate-400 shrink-0" />
      <Select value={selectedViewId || "none"} onValueChange={v => onSelectView(v === "none" ? null : v)}>
        <SelectTrigger className="h-8 text-sm w-52 border-slate-200">
          <SelectValue placeholder="Map view..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— No Preset —</SelectItem>
          {mapViews.map(v => (
            <SelectItem key={v.id} value={v.id}>
              <span className="flex items-center gap-2">
                <span>{v.name}</span>
                <span className="text-xs text-slate-400">{v.view_type}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0" onClick={() => setSaveOpen(true)}>
        <Plus className="w-3 h-3" /> Save View
      </Button>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Save Current Filters as Map View</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs">View Name *</Label>
              <Input placeholder="e.g. Athens P1 Inspection" value={viewName} onChange={e => setViewName(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Optional description..." value={viewDesc} onChange={e => setViewDesc(e.target.value)} className="mt-1 text-sm" rows={2} />
            </div>
            <div>
              <Label className="text-xs">View Type</Label>
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Default", "Inspection", "Priority", "Assignment", "Custom"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving || !viewName.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}