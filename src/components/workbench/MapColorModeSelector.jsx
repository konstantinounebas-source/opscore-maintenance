import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";
import { COLOR_MODES } from "./workbenchUtils";

export default function MapColorModeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <Palette className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs w-44 border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={{ zIndex: 99999 }}>
          {COLOR_MODES.map(m => (
            <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}