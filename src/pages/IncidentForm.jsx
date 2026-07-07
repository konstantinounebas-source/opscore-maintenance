import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function IncidentForm() {
  const params = new URLSearchParams(window.location.search);
  const assetId = params.get("asset_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Defer dialog open to next tick to avoid Radix Portal "removeChild" DOMException
  // that occurs when a Dialog portal mounts synchronously during a route transition.
  useEffect(() => {
    const timer = setTimeout(() => setDialogOpen(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const createMutation = useMutation({
    mutationFn: async ({ data, pendingFiles }) => {
      // Validate incident_id uniqueness before creation to prevent duplicates
      const existing = await base44.entities.Incidents.filter({ incident_id: data.incident_id });
      if (existing.length > 0) {
        throw new Error(`Incident ID ${data.incident_id} already exists. Please try again.`);
      }
      
      const inc = await base44.entities.Incidents.create(data);
      const user = await base44.auth.me();
      await base44.entities.IncidentAuditTrail.create({ incident_id: inc.id, action: "Incident Created", details: `Incident ${data.incident_id} created`, user: user?.email });
      if (assetId) {
        await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Incident Opened", details: `Incident ${data.incident_id}: ${data.title}`, user: user?.email });
      }
      // #6 — Mirror initial evidence uploads to IncidentAttachments with is_initial_upload flag
      if (pendingFiles?.length > 0) {
        for (const file of pendingFiles) {
          await base44.entities.IncidentAttachments.create({
            incident_id: inc.id,
            file_name: file.name,
            file_url: file.url,
            file_type: file.type,
            uploaded_by: user?.email,
            is_initial_upload: true,
          });
        }
      }
      return inc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Incident created" });
      if (assetId) {
        navigate(`/AssetDetail?id=${assetId}`);
      } else {
        navigate("/Incidents");
      }
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">New Incident</h1>
      </div>
      {!dialogOpen && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      )}
      <IncidentFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) navigate(-1); }}
        defaultAssetId={assetId}
        onSave={(data, pendingFiles) => createMutation.mutate({ data, pendingFiles })}
      />
    </div>
  );
}