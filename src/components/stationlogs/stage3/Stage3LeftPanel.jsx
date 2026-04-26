import React, { useState } from "react";
import { MapPin, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function Stage3LeftPanel({ stationData, asset, log, stage2Summary }) {
  const d = stationData || {};
  const lat = d.latitude;
  const lng = d.longitude;
  const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="text-sm">
      {/* Top header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
        <p className="text-xs font-bold text-blue-800 uppercase">Stage 3 Planning Context</p>
        <p className="text-[10px] text-blue-600 mt-0.5">Station info and Stage 1/2 constraints for planning.</p>
      </div>

      {/* Station Info — open by default */}
      <Section title="Station Info" defaultOpen={true}>
        <Field label="Bus Stop ID" value={asset?.asset_code} />
        <Field label="Name" value={d.bus_stop_name} />
        <Field label="Municipality" value={d.municipality} />
        <Field label="Location Address" value={d.location_address} />
        <Field label="Shelter Type" value={d.shelter_type} />
        <Field label="Risk Level" value={d.risk_level} />
      </Section>

      {/* Stage 1 Constraints — open by default */}
      <Section title="Stage 1 Constraints" defaultOpen={true}>
        <Field label="Order Received" value={d.order_received_date} />
        <Field label="Final Deadline" value={d.order_deadline_date} />
        <Field label="Priority Deadline" value={d.order_priority_date} />
      </Section>

      {/* Installation Type / Intervention — closed by default */}
      <Section title="Station Definition" icon={FileText} defaultOpen={false}>
        <Field label="Installation Type" value={d.installation_type} />
        <Field label="Intervention Scope" value={d.intervention_scope} />
        <Field label="Road Side" value={d.road_side} />
        <Field label="Traffic Direction" value={d.traffic_direction} />
      </Section>

      {/* Existing Conditions — closed by default */}
      <Section title="Existing Conditions" icon={FileText} defaultOpen={false}>
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
      <Section title="Constraints / Risks" icon={FileText} defaultOpen={false}>
        <Field label="Has Underground Utilities" value={d.has_underground_utilities} />
        <Field label="Utility Type" value={d.utility_type} />
        <Field label="Traffic Impact Level" value={d.traffic_impact_level} />
        <Field label="Requires Traffic Management" value={d.requires_traffic_management} />
        <Field label="Requires Permits" value={d.requires_permits} />
        <Field label="Permit Type" value={d.permit_type} />
        <Field label="Site Constraints Notes" value={d.site_constraints_notes} />
        <Field label="Risk Description" value={d.risk_description} />
      </Section>

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

      {/* Stage 2 Summary — at bottom, open by default if data exists */}
      {stage2Summary && (
        <Section title="Stage 2 Summary" defaultOpen={true}>
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
    </div>
  );
}