import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, MapPin, ExternalLink, AlertTriangle, Wrench } from "lucide-react";
import { assignmentStatusColor, priorityBucketColor, pinColorStyle } from "./planningUtils";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

function FieldRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs text-slate-800 text-right font-medium">{value}</span>
    </div>
  );
}

export default function AssetDetailPanel({ asset, assignment, latestIncident, latestWorkOrder, selectedWeek, onAssign, onEditAssignment }) {
  const navigate = useNavigate();

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
        <MapPin className="w-7 h-7 mb-2 opacity-30" />
        <p className="text-sm">Click a map marker or table row to view details</p>
      </div>
    );
  }

  const safeDate = (d) => { try { return d ? format(new Date(d), "MMM d, yyyy") : null; } catch { return null; } };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 font-mono">{asset.asset_id}</div>
          <div className="text-sm font-semibold mt-0.5 truncate">{asset.asset_name}</div>
          {asset.location_address && <div className="text-xs text-slate-400 mt-0.5 truncate">{asset.location_address}</div>}
        </div>
        <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-700 h-7 text-xs shrink-0"
          onClick={() => navigate(`/AssetDetail?id=${asset.id}`)}>
          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
        </Button>
      </div>

      {/* Asset Info */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Asset Details</div>
        <FieldRow label="Shelter ID"     value={asset.active_shelter_id} />
        <FieldRow label="City"           value={asset.city} />
        <FieldRow label="Shelter Type"   value={asset.shelter_type} />
        <FieldRow label="Status"         value={asset.status} />
        <FieldRow label="Next Inspection" value={safeDate(asset.next_inspection_date)} />
        {asset.latitude && asset.longitude && (
          <FieldRow label="Coordinates" value={`${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}`} />
        )}
      </div>

      {/* Week Assignment */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Week Assignment
          </div>
          {!assignment && selectedWeek && (
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => onAssign(asset)}>
              <Plus className="w-3 h-3" /> Assign
            </Button>
          )}
          {assignment && (
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-indigo-600" onClick={() => onEditAssignment(assignment)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          )}
        </div>
        {!assignment ? (
          <p className="text-xs text-slate-400">Not assigned to this week.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={pinColorStyle(assignment.pin_color)} />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${assignmentStatusColor(assignment.assignment_status)}`}>
                {assignment.assignment_status}
              </span>
              {assignment.priority_bucket && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${priorityBucketColor(assignment.priority_bucket)}`}>
                  {assignment.priority_bucket}
                </span>
              )}
            </div>
            <FieldRow label="Type"        value={assignment.assignment_type} />
            <FieldRow label="Assigned To" value={assignment.assigned_to} />
            <FieldRow label="Team"        value={assignment.team_name} />
            <FieldRow label="Zone"        value={assignment.route_zone} />
            {assignment.notes && <div className="text-xs text-slate-500 italic mt-1 border-t border-slate-100 pt-1.5">{assignment.notes}</div>}
          </div>
        )}
      </div>

      {/* Latest Incident */}
      {latestIncident && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Latest Incident
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600"
              onClick={() => navigate(`/IncidentDetail?id=${latestIncident.id}`)}>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-xs font-medium text-slate-800">{latestIncident.incident_id} — {latestIncident.title}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
            <span>{latestIncident.status}</span>
            <span>·</span>
            <span>{latestIncident.priority}</span>
            {latestIncident.reported_date && <><span>·</span><span>{safeDate(latestIncident.reported_date)}</span></>}
          </div>
        </div>
      )}

      {/* Latest Work Order */}
      {latestWorkOrder && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            <Wrench className="w-3.5 h-3.5 text-indigo-400" /> Latest Work Order
          </div>
          <div className="text-xs font-medium text-slate-800">{latestWorkOrder.work_order_id} — {latestWorkOrder.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{latestWorkOrder.status} · {latestWorkOrder.priority}</div>
        </div>
      )}
    </div>
  );
}