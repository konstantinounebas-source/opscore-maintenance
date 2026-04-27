/**
 * EmbeddedFormWrapper
 * Handles loading of existing form submissions (especially FMPI)
 * and prevents duplicate form creation by passing submission data to forms
 */
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import MakeSafeChecklistForm from "@/components/forms/MakeSafeChecklistForm";
import WorkOrderFormF from "@/components/forms/WorkOrderFormF";

export default function EmbeddedFormWrapper({
  woType,
  incidentId,
  allIncidents,
  allAssets,
  allWorkOrders,
  allChildAssets,
  onClose,
}) {
  // Load existing FMPI submission if it exists
  const { data: existingFMPI = [], isLoading: fmpiLoading } = useQuery({
    queryKey: ["fmpiSubmissions", incidentId],
    queryFn: async () => {
      if (woType !== "corrective") return [];
      const submissions = await base44.entities.FormSubmissions.filter({
        incident_id: incidentId,
        form_type: "combined_fmpi_invoice",
      });
      return submissions;
    },
  });

  // Load existing Make Safe submission if it exists
  const { data: existingMakeSafe = [], isLoading: makeSafeLoading } = useQuery({
    queryKey: ["makeSafeSubmissions", incidentId],
    queryFn: async () => {
      if (woType !== "make_safe") return [];
      const submissions = await base44.entities.FormSubmissions.filter({
        incident_id: incidentId,
        form_type: "make_safe",
      });
      return submissions;
    },
  });

  const isLoading = fmpiLoading || makeSafeLoading;
  const fmpiToEdit = woType === "corrective" ? existingFMPI[0] : null;
  const makeSafeToEdit = woType === "make_safe" ? existingMakeSafe[0] : null;

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0">
        {woType === "make_safe" && (
          <MakeSafeChecklistForm
            submission={makeSafeToEdit}
            incidents={allIncidents}
            assets={allAssets}
            workOrders={allWorkOrders}
            onClose={onClose}
            defaultIncidentId={incidentId}
          />
        )}
        {woType === "corrective" && (
          <WorkOrderFormF
            submission={fmpiToEdit}
            incidents={allIncidents}
            assets={allAssets}
            workOrders={allWorkOrders}
            childAssets={allChildAssets}
            crews={[]}
            onClose={onClose}
            defaultIncidentId={incidentId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}