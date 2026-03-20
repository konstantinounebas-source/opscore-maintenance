import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";

const RESET_PASSWORD = "123456789";

export default function ResetIncidentDialog({ incident, incidentId, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("password"); // "password" | "confirm"
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setPassword("");
    setStep("password");
    setError("");
    onOpenChange(false);
  };

  const handlePasswordSubmit = () => {
    if (password !== RESET_PASSWORD) {
      setError("Incorrect password.");
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      // 1. Delete all audit trail entries
      const auditEntries = await base44.entities.IncidentAuditTrail.filter({ incident_id: incidentId });
      for (const entry of auditEntries) {
        await base44.entities.IncidentAuditTrail.delete(entry.id);
      }

      // 2. Delete all attachments
      const attachments = await base44.entities.IncidentAttachments.filter({ incident_id: incidentId });
      for (const att of attachments) {
        await base44.entities.IncidentAttachments.delete(att.id);
      }

      // 3. Delete linked work orders (by incident title reference)
      const allWOs = await base44.entities.WorkOrders.filter({ related_asset_id: incident.related_asset_id });
      const incidentWOs = allWOs.filter(w => w.title?.includes(incident.incident_id));
      for (const wo of incidentWOs) {
        await base44.entities.WorkOrders.delete(wo.id);
      }

      // 4. Reset incident workflow flags & status
      await base44.entities.Incidents.update(incidentId, {
        status: "Open",
        confirmation_done: false,
        ompi_done: false,
        owr_fmpi_done: false,
        inspection_done: false,
        make_safe_done: false,
        corrective_done: false,
        checklist_done: false,
        revisit_done: false,
        finalise_done: false,
      });

      // Refresh all related queries
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentComments", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["workOrders", incidentId] });

      toast({ title: "Incident reset successfully" });
      handleClose();
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <RotateCcw className="w-4 h-4" /> Reset Incident
          </DialogTitle>
        </DialogHeader>

        {step === "password" && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-slate-600">
              This action requires a password. Enter the administrator password to proceed.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handlePasswordSubmit()}
                className="text-sm"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handlePasswordSubmit} disabled={!password}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-700 space-y-1">
                <p className="font-semibold">This will permanently delete:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>All audit trail entries</li>
                  <li>All uploaded attachments</li>
                  <li>All linked work orders (OMPI, FMPI, Make Safe, Inspection, Corrective)</li>
                  <li>All workflow progress flags</li>
                </ul>
                <p className="mt-1 font-semibold">Incident: <span className="text-red-800">{incident?.incident_id}</span> — This cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleReset} disabled={resetting}>
                {resetting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {resetting ? "Resetting..." : "Yes, Reset Everything"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}