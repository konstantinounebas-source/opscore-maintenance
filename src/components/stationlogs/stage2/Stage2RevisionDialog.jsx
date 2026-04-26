import React from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";

/**
 * Lightweight bridge: directs user to create a Stage 1 revision via the existing
 * OrderLocationModule / revision flow (Stage 1 accordion). Stage 2 will re-run
 * matching on next open once Stage 1 data is updated.
 */
export default function Stage2RevisionDialog({ log, currentData, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="font-bold text-slate-800">Create Stage 1 Revision</p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-800">
            <strong>Warning:</strong> Changing Stage 1 data will affect the auto-suggested works in Stage 2.
            After saving a revision, re-open the Stage 2 Workspace to refresh the suggested works.
          </p>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          To create a Stage 1 revision, close the Stage 2 workspace, go to <strong>Stage 1 — Order + Location</strong> in the workflow accordion, and use the <strong>"Request Revision"</strong> or edit controls there.
        </p>

        <p className="text-xs text-slate-400 mb-4">
          Stage 1 revisions are version-controlled. Your original data is preserved.
          Once a revision is approved and becomes active, Stage 2 will automatically use the updated data.
        </p>

        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}