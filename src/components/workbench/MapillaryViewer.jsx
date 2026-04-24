import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

export default function MapillaryViewer({ asset, isOpen, onClose }) {
  if (!asset?.latitude || !asset?.longitude) {
    return null;
  }

  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${asset.latitude}&lng=${asset.longitude}&z=17&focus=photo`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] p-0 border-0 bg-black">
        <div className="relative w-full h-[80vh] bg-black">
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 flex items-center justify-between">
            <DialogTitle className="text-white text-lg">{asset.asset_id} - Street View</DialogTitle>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <iframe
            src={mapillaryUrl}
            className="w-full h-full border-0"
            title={`Mapillary Street View - ${asset.asset_id}`}
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}