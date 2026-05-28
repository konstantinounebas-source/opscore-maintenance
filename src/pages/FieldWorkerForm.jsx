import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import MobileMakeSafeForm from "@/components/fieldworker/MobileMakeSafeForm.jsx";
import MobileCorrectiveForm from "@/components/fieldworker/MobileCorrectiveForm.jsx";

export default function FieldWorkerForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No form token provided. Please use the link sent to you via Telegram.");
      setLoading(false);
      return;
    }
    loadFormData();
  }, [token]);

  const loadFormData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getFieldWorkerFormData', { token });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setFormData(res.data);
      }
    } catch (err) {
      setError(err?.message || "Failed to load form data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
        <p className="text-sm text-slate-500">Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white rounded-xl border border-red-200 p-6 text-center shadow">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-red-700 mb-2">Unable to Load Form</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white rounded-xl border border-green-200 p-6 text-center shadow">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-green-700 mb-2">Form Submitted!</h2>
          <p className="text-sm text-slate-600">
            Your form has been submitted successfully. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  const { formType, incident, asset, workOrders, existingSubmission } = formData;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Smart Bus Shelters</p>
          <h1 className="text-sm font-bold">
            {formType === 'make_safe' ? '🛡️ Make-Safe Checklist' : '🔧 Corrective Work Order'}
          </h1>
        </div>
      </div>

      {/* Incident info banner */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="flex gap-4 text-xs text-slate-600 flex-wrap">
          <span><span className="font-semibold text-slate-800">Incident:</span> {incident?.incident_id}</span>
          {asset && <span><span className="font-semibold text-slate-800">Asset:</span> {asset?.asset_id} — {asset?.location_address}</span>}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-4">
        {formType === 'make_safe' ? (
          <MobileMakeSafeForm
            token={token}
            incident={incident}
            asset={asset}
            workOrders={workOrders}
            existingSubmission={existingSubmission}
            onSubmitted={() => setSubmitted(true)}
          />
        ) : (
          <MobileCorrectiveForm
            token={token}
            incident={incident}
            asset={asset}
            workOrders={workOrders}
            existingSubmission={existingSubmission}
            onSubmitted={() => setSubmitted(true)}
          />
        )}
      </div>
    </div>
  );
}