import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MapillaryViewer({ asset, isOpen, onClose }) {
  if (!asset?.latitude || !asset?.longitude) {
    return null;
  }

  const streetViewUrl = `https://www.google.com/maps/@${asset.latitude},${asset.longitude},3a,75y,0h,90t`;

  const handleOpenStreetView = () => {
    window.open(streetViewUrl, "_blank", "width=1200,height=800");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>{asset.asset_id} - Street View</DialogTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-slate-600">
            <p className="font-medium mb-2">Coordinates:</p>
            <p className="text-xs font-mono text-slate-500">
              {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
            </p>
          </div>
          
          <p className="text-sm text-slate-600">
            Δες τη θέση του περιουσιακού στοιχείου από το δρόμο χρησιμοποιώντας το Google Maps Street View.
          </p>

          <Button
            onClick={handleOpenStreetView}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Άνοιγμα Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}