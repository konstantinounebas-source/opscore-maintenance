import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, FileText, Image, ExternalLink, AlertTriangle,
  ChevronDown, ChevronRight, Eye, Download
} from "lucide-react";
import Stage2RevisionDialog from "./Stage2RevisionDialog";
import Stage2AttachmentPreview from "./Stage2AttachmentPreview";

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
  if (!value && value !== false && value !== 0) return null;
  const display = value === true ? "Yes" : value === false ? "No" : String(value);
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-semibold text-slate-400 uppercase w-32 shrink-0 mt-0.5">{label}</span>
      <span className="text-xs text-slate-800 break-words">{display}</span>
    </div>
  );
}

function AttachmentRow({ att, onPreview }) {
  const isImage = att.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_name || "");
  const isPDF = att.mime_type === "application/pdf" || /\.pdf$/i.test(att.file_name || "");

  return (
    <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
      {isImage
        ? <Image className="h-4 w-4 text-blue-400 shrink-0" />
        : <FileText className="h-4 w-4 text-slate-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-800 truncate">{att.file_name}</p>
        <p className="text-[10px] text-slate-400">{att.attachment_category || att.file_type || "File"} · {att.file_size || ""}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {(isImage || isPDF) && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onPreview(att)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        <a href={att.file_url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function Stage2LeftPanel({ log, currentData, attachments, stationLogId }) {
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [previewAtt, setPreviewAtt] = useState(null);

  // Load attachments if not passed
  const { data: fetchedAtts = [] } = useQuery({
    queryKey: ["stage1atts", stationLogId],
    queryFn: () => base44.entities.StationLogOrderAttachments.filter({ station_log_id: stationLogId }),
    enabled: !attachments,
  });
  const atts = attachments || fetchedAtts;

  const d = currentData || {};
  const lat = d.latitude;
  const lng = d.longitude;
  const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="text-sm">
      {/* Top header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
        <p className="text-xs font-bold text-blue-800 uppercase">Stage 1 Data Verification</p>
        <p className="text-[10px] text-blue-600 mt-0.5">Review all Stage 1 data before finalizing work allocation.</p>
      </div>

      {/* 1. Basic Location */}
      <Section title="Basic Location" icon={MapPin}>
        <Field label="Bus Stop ID" value={d.asset_id} />
        <Field label="Bus Stop Name" value={d.bus_stop_name} />
        <Field label="Address" value={d.location_address} />
        <Field label="Municipality" value={d.municipality} />
        <Field label="District" value={d.district} />
        <Field label="Area" value={d.area} />
        <Field label="Latitude" value={lat} />
        <Field label="Longitude" value={lng} />
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" /> Open in Google Maps
            </Button>
          </a>
        )}
      </Section>

      {/* 2. Technical Data */}
      <Section title="Technical Data">
        <Field label="Shelter Type" value={d.shelter_type} />
        <Field label="Installation Type" value={d.installation_type} />
        <Field label="Intervention Scope" value={d.intervention_scope} />
        <Field label="Pavement Type" value={d.pavement_type} />
        <Field label="Pavement Width" value={d.pavement_width} />
        <Field label="Existing Infrastructure" value={d.existing_infrastructure_type} />
        <Field label="Road Side" value={d.road_side} />
        <Field label="Traffic Direction" value={d.traffic_direction} />
        <Field label="Has Tactile Paving" value={d.has_tactile_paving} />
        <Field label="Has Bus Bay" value={d.has_bus_bay} />
        <Field label="Has Road Marking" value={d.has_road_marking} />
        <Field label="Requires Footway" value={d.requires_footway} />
        <Field label="Traffic Impact" value={d.traffic_impact_level} />
        <Field label="Requires Traffic Mgmt" value={d.requires_traffic_management} />
        <Field label="Requires Permits" value={d.requires_permits} />
        <Field label="Permit Type" value={d.permit_type} />
        <Field label="Risk Level" value={d.risk_level} />
        <Field label="Has Underground Utils" value={d.has_underground_utilities} />
        <Field label="Utility Type" value={d.utility_type} />
        {d.access_notes && <Field label="Access Notes" value={d.access_notes} />}
        {d.site_constraints_notes && <Field label="Site Constraints" value={d.site_constraints_notes} />}
        {d.risk_description && <Field label="Risk Notes" value={d.risk_description} />}
      </Section>

      {/* 3. Attachments */}
      <Section title={`Attachments (${atts.length})`} icon={FileText}>
        {atts.length === 0
          ? <p className="text-xs text-slate-400">No attachments found.</p>
          : atts.map(att => (
            <AttachmentRow key={att.id} att={att} onPreview={setPreviewAtt} />
          ))
        }
      </Section>

      {/* 4. Stage 1 Revision */}
      <Section title="Stage 1 Revision" defaultOpen={false}>
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">Changing Stage 1 data may change the suggested works in this workspace.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs w-full border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={() => setRevisionOpen(true)}
        >
          Create Stage 1 Revision
        </Button>
      </Section>

      {/* Revision Dialog */}
      {revisionOpen && (
        <Stage2RevisionDialog
          log={log}
          currentData={d}
          onClose={() => setRevisionOpen(false)}
        />
      )}

      {/* Attachment Preview */}
      {previewAtt && (
        <Stage2AttachmentPreview
          attachment={previewAtt}
          onClose={() => setPreviewAtt(null)}
        />
      )}
    </div>
  );
}