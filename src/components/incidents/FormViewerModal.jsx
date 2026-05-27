import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import CorrectiveWOForm from "@/components/forms/CorrectiveWOForm";
import MakeSafeChecklistForm from "@/components/forms/MakeSafeChecklistForm";
import InspectionWOChecklistForm from "@/components/forms/InspectionWOChecklistForm";

/**
 * Opens the editable form for a given WO type, pre-loaded with any existing submission.
 * The forms themselves have PDF/Print buttons built-in.
 */
export default function FormViewerModal({ woType, incident, incidentId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [assets, setAssets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  const formTypeMap = {
    corrective: "corrective_wo_checklist",
    make_safe: "make_safe_checklist",
    inspection: "inspection_wo_checklist",
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const formType = formTypeMap[woType];
      const [subs, wos] = await Promise.all([
        base44.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: formType }),
        base44.entities.WorkOrders.filter({ incident_id: incidentId }),
      ]);
      setSubmission(subs[0] || null);
      setWorkOrders(wos);

      // MakeSafe needs incidents + assets lists
      if (woType === "make_safe") {
        const [incs, asts] = await Promise.all([
          base44.entities.Incidents.list(),
          base44.entities.Assets.list(),
        ]);
        setIncidents(incs);
        setAssets(asts);
      }

      setLoading(false);
    };
    load();
  }, [woType, incidentId]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[96vh] p-0 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {woType === "corrective" && (
              <CorrectiveWOForm
                submission={submission}
                incident={incident}
                incidentId={incidentId}
                workOrders={workOrders}
                onClose={onClose}
              />
            )}
            {woType === "make_safe" && (
              <MakeSafeChecklistForm
                submission={submission}
                incidents={incidents}
                assets={assets}
                workOrders={workOrders}
                onClose={onClose}
                defaultIncidentId={incidentId}
              />
            )}
            {woType === "inspection" && (
              <InspectionWOChecklistForm
                submission={submission}
                incident={incident}
                incidentId={incidentId}
                workOrders={workOrders}
                onClose={onClose}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}