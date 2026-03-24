import React from "react";
import { X, MapPin, Building2, Calendar, Wrench, AlertTriangle } from "lucide-react";

export default function AssetMapPopup({ asset, assignment, onClose }) {
  if (!asset) return null;

  const Row = ({ label, value }) =>
    value ? (
      <div className="flex items-start gap-2 text-xs">
        <span className="text-slate-400 w-28 shrink-0">{label}</span>
        <span className="text-slate-800 font-medium">{value}</span>
      </div>
    ) : null;

  const statusColor = {
    Active: "bg-green-100 text-green-700",
    Delivered: "bg-blue-100 text-blue-700",
    "Under Maintenance": "bg-amber-100 text-amber-700",
    Inactive: "bg-slate-100 text-slate-500",
    Installed: "bg-indigo-100 text-indigo-700",
  }[asset.status] || "bg-slate-100 text-slate-500";

  const assignStatusColor = {
    Planned: "bg-blue-100 text-blue-700",
    "In Progress": "bg-amber-100 text-amber-700",
    Completed: "bg-green-100 text-green-700",
    Deferred: "bg-purple-100 text-purple-700",
    Cancelled: "bg-slate-100 text-slate-500",
  }[assignment?.assignment_status] || "";

  const priorityColor = {
    P1: "bg-red-100 text-red-700",
    P2: "bg-orange-100 text-orange-700",
  }[assignment?.priority_bucket] || "";

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-white text-sm font-semibold">
            {asset.active_shelter_id || asset.asset_id}
          </span>
          {asset.status && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor}`}>
              {asset.status}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5">
        <Row label="Shelter Type" value={asset.shelter_type} />
        <Row label="Category" value={asset.category} />
        <Row label="Location" value={asset.location_address} />
        <Row label="City" value={asset.city} />
        <Row label="Municipality" value={asset.municipality} />
        <Row label="Installation Date" value={asset.installation_date} />
        <Row label="Delivery Date" value={asset.delivery_date} />
        {asset.notes && (
          <div className="pt-1 border-t border-slate-100 text-xs text-slate-500 italic">{asset.notes}</div>
        )}
      </div>

      {/* Assignment section */}
      {assignment ? (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assignment</p>
          <div className="flex flex-wrap gap-1.5">
            {assignment.assignment_status && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${assignStatusColor}`}>
                {assignment.assignment_status}
              </span>
            )}
            {assignment.priority_bucket && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityColor}`}>
                {assignment.priority_bucket}
              </span>
            )}
            {assignment.assignment_type && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                {assignment.assignment_type}
              </span>
            )}
          </div>
          {assignment.team_name && <Row label="Team" value={assignment.team_name} />}
          {assignment.route_zone && <Row label="Zone" value={assignment.route_zone} />}
          {assignment.planned_date && <Row label="Planned Date" value={assignment.planned_date} />}
          {assignment.notes && <p className="text-xs text-slate-500 italic pt-0.5">{assignment.notes}</p>}
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400 italic">No assignment for selected week</p>
        </div>
      )}
    </div>
  );
}