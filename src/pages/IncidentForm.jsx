import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import { useToast } from "@/components/ui/use-toast";

export default function IncidentForm() {
  const params = new URLSearchParams(window.location.search);
  const assetId = params.get("asset_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const inc = await base44.entities.Incidents.create(data);
      const user = await base44.auth.me();
      await base44.entities.IncidentAuditTrail.create({ incident_id: inc.id, action: "Incident Created", details: `Incident ${data.incident_id} created`, user: user?.email });
      if (assetId) {
        await base44.entities.AssetTransactions.create({ asset_id: assetId, action: "Incident Opened", details: `Incident ${data.incident_id}: ${data.title}`, user: user?.email });
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
    <IncidentFormDialog
      open={true}
      onOpenChange={(open) => { if (!open) navigate(-1); }}
      defaultAssetId={assetId}
      onSave={(data) => createMutation.mutate(data)}
    />
  );
}