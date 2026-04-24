import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

export default function MapillaryViewer({ asset, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && window.mapillary) {
      setLoading(false);
    }
  }, [isOpen]);

  if (!asset?.latitude || !asset?.longitude) {
    return null;
  }

  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${asset.latitude}&lng=${asset.longitude}&z=17&focus=photo`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-96 p-0 border-0">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <DialogTitle className="text-white text-lg">{asset.asset_id} - Street View</DialogTitle>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <iframe
          src={mapillaryUrl}
          className="w-full h-full border-0 rounded-md"
          title={`Mapillary Street View - ${asset.asset_id}`}
          allowFullScreen
          loading="lazy"
        />
      </DialogContent>
    </Dialog>
  );
}