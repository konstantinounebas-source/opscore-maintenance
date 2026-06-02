import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import CorrectiveWOForm from "@/components/forms/CorrectiveWOForm";
import MakeSafeChecklistForm from "@/components/forms/MakeSafeChecklistForm";
import InspectionWOChecklistForm from "@/components/forms/InspectionWOChecklistForm";

/**
 * Opens the editable form for a given WO type.
 * If `submission` is provided (from a field worker WO card) it is used directly.
 * If `workOrder` is provided, its ID is used to filter form submissions.
 * Falls back to any submission for the incident+form type.
 */
export default function FormViewerModal({ woType, incident, incidentId, workOrder, submission: submissionProp, onClose }) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(submissionProp || null);
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

      // If submission was passed in directly, skip fetching it
      let resolvedSubmission = submissionProp || null;

      const promises = [
        base44.entities.WorkOrders.filter({ incident_id: incidentId }),
      ];

      // Only fetch submissions if not already provided
      if (!resolvedSubmission) {
        promises.push(base44.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: formType }));
      }

      // MakeSafe needs incidents + assets lists
      if (woType === "make_safe") {
        promises.push(base44.entities.Incidents.list());
        promises.push(base44.entities.Assets.list());
      }

      const results = await Promise.all(promises);
      let idx = 0;

      const wos = results[idx++];
      setWorkOrders(wos);

      if (!resolvedSubmission) {
        const subs = results[idx++];
        // Prefer submission linked to the specific WO, fall back to first
        if (workOrder) {
          resolvedSubmission = subs.find(s => s.work_order_id === workOrder.id) || subs[0] || null;
        } else {
          resolvedSubmission = subs[0] || null;
        }
      }

      setSubmission(resolvedSubmission);

      if (woType === "make_safe") {
        setIncidents(results[idx++]);
        setAssets(results[idx++]);
      }

      setLoading(false);
    };
    load();
  }, [woType, incidentId, workOrder?.id]);

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
                workOrder={workOrder}
                onClose={onClose}
              />
            )}
            {woType === "make_safe" && (
              <MakeSafeChecklistForm
                submission={submission}
                incidents={incidents}
                assets={assets}
                workOrders={workOrders}
                workOrder={workOrder}
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
                workOrder={workOrder}
                onClose={onClose}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}