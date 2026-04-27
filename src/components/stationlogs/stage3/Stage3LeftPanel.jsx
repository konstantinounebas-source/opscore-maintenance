import React, { useState } from "react";
import { MapPin, FileText, ChevronDown, ChevronRight, Pencil, X, Download, Eye, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderLocationModule from "@/components/stationlogs/stage1/OrderLocationModule";

function Section({ title, icon: SectionIcon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200">
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left bg-slate-50 hover:bg-slate-100"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
        {SectionIcon && <SectionIcon className="h-3.5 w-3.5 text-slate-500" />}
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</span>
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  );
}

function Field({ label, value }) {
  const isEmpty = value === null || value === undefined || value === "";
  const display = value === true ? "Yes" : value === false ? "No" : isEmpty ? null : String(value);
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-semibold text-slate-400 uppercase w-32 shrink-0 mt-0.5">{label}</span>
      {isEmpty
        ? <span className="text-xs text-slate-300 italic">—</span>
        : <span className="text-xs text-slate-800 break-words">{display}</span>
      }
    </div>
  );
}

export default function Stage3LeftPanel({ stationData, asset, log, stage2Summary, attachments = [] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [previewAttachmentId, setPreviewAttachmentId] = useState(null);
  const d = stationData || {};
  const lat = d.latitude;
  const lng = d.longitude;
  const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  
  const previewAttachment = attachments.find(a => a.id === previewAttachmentId);

  return (
    <div className="text-sm">
      {/* Top header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
        <p className="text-xs font-bold text-blue-800 uppercase">Stage 1 Data Verification</p>
        <p className="text-[10px] text-blue-600 mt-0.5">Review all Stage 1 data before finalizing work allocation.</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 mt-2 border-amber-300 text-amber-700 hover:bg-amber-50 w-full"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3 w-3" /> Edit / Request Revision
        </Button>
      </div>

      {/* Order Info — closed by default */}
      <Section title="Order Info" icon={FileText} defaultOpen={false}>
        <Field label="Authority Order Ref" value={d.authority_order_reference} />
        <Field label="Order Received Date" value={d.order_received_date} />
        <Field label="Order Received From" value={d.order_received_from} />
        <Field label="Order Type" value={d.order_type} />
        <Field label="Order Priority" value={d.order_priority} />
        <Field label="Order Priority Date" value={d.order_priority_date} />
        <Field label="Order Deadline Date" value={d.order_deadline_date} />
        <Field label="Order Description" value={d.order_description} />
        <Field label="Order Notes" value={d.order_notes} />
      </Section>

      {/* Location — closed by default */}
      <Section title="Location" icon={MapPin} defaultOpen={false}>
        <Field label="Bus Stop Name" value={d.bus_stop_name} />
        <Field label="Location Address" value={d.location_address} />
        <Field label="Municipality" value={d.municipality} />
        <Field label="District" value={d.district} />
        <Field label="Area" value={d.area} />
        <Field label="Latitude" value={lat} />
        <Field label="Longitude" value={lng} />
        <Field label="Map Link" value={d.map_link} />
      </Section>

      {/* Station Definition — closed by default */}
      <Section title="Station Definition" defaultOpen={false}>
        <Field label="Shelter Type" value={d.shelter_type} />
        <Field label="Installation Type" value={d.installation_type} />
        <Field label="Intervention Scope" value={d.intervention_scope} />
        <Field label="Road Side" value={d.road_side} />
        <Field label="Traffic Direction" value={d.traffic_direction} />
      </Section>

      {/* Existing Conditions — closed by default */}
      <Section title="Existing Conditions" defaultOpen={false}>
        <Field label="Existing Infrastructure Type" value={d.existing_infrastructure_type} />
        <Field label="Pavement Type" value={d.pavement_type} />
        <Field label="Pavement Width" value={d.pavement_width} />
        <Field label="Has Tactile Paving" value={d.has_tactile_paving} />
        <Field label="Has Bus Bay" value={d.has_bus_bay} />
        <Field label="Has Road Marking" value={d.has_road_marking} />
        <Field label="Requires Footway" value={d.requires_footway} />
        <Field label="Access Notes" value={d.access_notes} />
      </Section>

      {/* Constraints / Risks — closed by default */}
      <Section title="Constraints / Risks" defaultOpen={false}>
        <Field label="Has Underground Utilities" value={d.has_underground_utilities} />
        <Field label="Utility Type" value={d.utility_type} />
        <Field label="Traffic Impact Level" value={d.traffic_impact_level} />
        <Field label="Requires Traffic Management" value={d.requires_traffic_management} />
        <Field label="Requires Permits" value={d.requires_permits} />
        <Field label="Permit Type" value={d.permit_type} />
        <Field label="Site Constraints Notes" value={d.site_constraints_notes} />
        <Field label="Risk Description" value={d.risk_description} />
      </Section>

      {/* Attachments section */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-200 space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Attachments</p>
          <div className="space-y-1.5">
            {attachments.map(att => {
              const isImage = att.file_type === "photo" || att.file_name?.match(/\.(jpg|jpeg|png|gif)$/i);
              return (
                <div key={att.id} className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors group">
                  {isImage ? (
                    <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs text-slate-700 truncate flex-1">{att.file_name}</span>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={att.file_url}
                      download
                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-white"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => setPreviewAttachmentId(att.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-white"
                      title="View"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open in Google Maps */}
      {mapsUrl && (
        <div className="px-4 py-3 border-b border-slate-200">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full">
              <MapPin className="h-3.5 w-3.5" /> Open in Google Maps
            </Button>
          </a>
        </div>
      )}

      {/* Stage 2 Summary — at bottom, closed by default if data exists */}
      {stage2Summary && (
        <Section title="Stage 2 Summary" defaultOpen={false}>
          <Field label="Total Time" value={stage2Summary.totalTime} />
          <Field label="Selected Works" value={`${stage2Summary.worksCount} items`} />
          {stage2Summary.resourceBreakdown && stage2Summary.resourceBreakdown.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Resources</span>
              {stage2Summary.resourceBreakdown.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-xs text-slate-600">{r.name}</span>
                  <span className="text-xs font-mono text-slate-800">{r.display}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Edit / Revision Overlay */}
      {editOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex flex-col">
          <div className="flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3 shrink-0">
            <p className="font-bold text-slate-800">Stage 1 — Order + Location (Edit / Revision)</p>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <OrderLocationModule log={log} asset={asset} />
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl max-h-[80vh] overflow-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
              <p className="font-semibold text-slate-800 truncate">{previewAttachment.file_name}</p>
              <button
                onClick={() => setPreviewAttachmentId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {previewAttachment.file_type === "photo" || previewAttachment.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img
                  src={previewAttachment.file_url}
                  alt={previewAttachment.file_name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <a
                  href={previewAttachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <FileText className="h-16 w-16 text-slate-300" />
                  <p className="text-sm text-slate-600">Click to open {previewAttachment.file_name}</p>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}