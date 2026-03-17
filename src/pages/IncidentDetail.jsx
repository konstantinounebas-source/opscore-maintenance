import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import AuditLog from "@/components/shared/AuditLog";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import IncidentWorkflow from "@/components/incidents/IncidentWorkflow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Send, ChevronDown, ChevronUp, Paperclip, Loader2 } from "lucide-react";

export default function IncidentDetail() {
  const params = new URLSearchParams(window.location.search);
  const incidentId = params.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState("Comment");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const { data: incident } = useQuery({ queryKey: ["incident", incidentId], queryFn: () => base44.entities.Incidents.filter({ id: incidentId }).then(r => r[0]), enabled: !!incidentId });
  const { data: comments = [] } = useQuery({ queryKey: ["incidentComments", incidentId], queryFn: () => base44.entities.IncidentComments.filter({ incident_id: incidentId }), enabled: !!incidentId });
  const { data: auditTrail = [] } = useQuery({ queryKey: ["incidentAudit", incidentId], queryFn: () => base44.entities.IncidentAuditTrail.filter({ incident_id: incidentId }), enabled: !!incidentId });
  const { data: attachments = [] } = useQuery({ queryKey: ["incidentAttachments", incidentId], queryFn: () => base44.entities.IncidentAttachments.filter({ incident_id: incidentId }), enabled: !!incidentId });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentComments", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
  };

  const addAuditEntry = async (action, details) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action, details, user: user?.email });
  };

  const updateIncident = useMutation({
    mutationFn: (data) => base44.entities.Incidents.update(incidentId, data),
    onSuccess: () => { invalidateAll(); setEditOpen(false); toast({ title: "Incident updated" }); },
  });

  const handleEditSave = async (data) => {
    await addAuditEntry("Incident Updated", "Incident details modified");
    updateIncident.mutate(data);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    const user = await base44.auth.me();
    await base44.entities.IncidentComments.create({ incident_id: incidentId, content: comment, comment_type: commentType, author: user?.email });
    await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action: `${commentType} Added`, details: comment.substring(0, 100), user: user?.email });
    setComment("");
    invalidateAll();
    toast({ title: `${commentType} added` });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const user = await base44.auth.me();
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.IncidentAttachments.create({ file_url, file_name: file.name, file_type: file.type.startsWith("image/") ? "Photo" : "Document", incident_id: incidentId, uploaded_by: user?.email });
    await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action: "Attachment Uploaded", details: file.name, user: user?.email, attachments: [file_url], attachment_names: [file.name] });
    setUploading(false);
    e.target.value = "";
    invalidateAll();
    toast({ title: "File uploaded" });
  };

  if (!incident) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const sortedAudit = [...auditTrail].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div>
      <TopHeader
        title={incident.title}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/Incidents")}><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back</Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Always-visible fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <IField label="Incident ID" value={incident.incident_id} />
            <IField label="Related Asset" value={incident.related_asset_name} />
            <IField label="Status"><StatusBadge status={incident.status} /></IField>
            <IField label="Priority"><StatusBadge status={incident.priority} /></IField>
            <IField label="Category" value={incident.category} />
            <IField label="Reported Date" value={incident.reported_date} />
            <IField label="Assigned To" value={incident.assigned_to} />
            <IField label="Created" value={incident.created_date ? format(new Date(incident.created_date), "MMM d, yyyy") : null} />
          </div>

          {/* Expandable extra fields */}
          {showMore && (
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
              <IField label="Issue Date" value={incident.issue_date} />
              <IField label="Τρόπος Αναφοράς" value={incident.incident_reporting_method} />
              <IField label="Reported By" value={incident.reported_by_name} />
              <IField label="Reporter Phone" value={incident.reported_by_phone} />
              <IField label="Reporter Email" value={incident.reported_by_email} />
              <IField label="Province" value={incident.province} />
              <IField label="Municipality" value={incident.municipality} />
              <IField label="Shelter ID" value={incident.active_shelter_id} />
              <IField label="Location Address" value={incident.location_address} />
              <IField label="First Report Date" value={incident.first_report_date} />
              <IField label="Detection Time" value={incident.detection_time} />
              <IField label="Incident Source" value={incident.incident_source} />
              <IField label="Work Order Ref" value={incident.work_order_reference} />
              <IField label="Initial Priority" value={incident.initial_priority} />
              <IField label="OWR" value={incident.is_owr ? "Yes" : incident.is_owr === false ? "No" : null} />
              <IField label="Requires Make-Safe" value={incident.requires_make_safe ? "Yes" : incident.requires_make_safe === false ? "No" : null} />
              <IField label="Approval Date" value={incident.approval_date} />
              <IField label="Authority Representative" value={incident.authority_representative} />
              {incident.subsystem_structural_selected && <IField label="Structural Issue" value={incident.subsystem_structural_issue} />}
              {incident.subsystem_electrical_selected && <IField label="Electrical Issue" value={incident.subsystem_electrical_issue} />}
              {incident.subsystem_electronic_selected && <IField label="Electronic Issue" value={incident.subsystem_electronic_issue} />}
              {incident.probable_cause && <IField label="Probable Cause" value={incident.probable_cause} />}
              {incident.damage_description && <div className="col-span-2 md:col-span-4"><IField label="Damage Description" value={incident.damage_description} /></div>}
              {incident.description && <div className="col-span-2 md:col-span-4"><IField label="Description" value={incident.description} /></div>}
            </div>
          )}

          {/* Description always shown if present and showMore is off */}
          {!showMore && incident.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700">{incident.description}</p>
            </div>
          )}

          <button
            onClick={() => setShowMore(v => !v)}
            className="mt-5 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showMore ? <><ChevronUp className="w-3.5 h-3.5" /> Show Less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show More Info</>}
          </button>
        </div>

        {/* Workflow */}
        <IncidentWorkflow incident={incident} incidentId={incidentId} onRefresh={invalidateAll} />

        {/* Unified Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-700">Activity & Audit Trail</h3>
            <span className="text-xs text-slate-400">{auditTrail.length + comments.length + attachments.length} entries</span>
          </div>

          {/* Add comment / attach file */}
          <div className="flex gap-2 mb-6 pb-5 border-b border-slate-100">
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger className="w-28 h-9 text-xs shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Comment">Comment</SelectItem>
                <SelectItem value="Note">Note</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment or note..." className="flex-1 min-h-[40px] text-sm" rows={2} />
            <div className="flex flex-col gap-1.5 self-end">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-9" onClick={handleAddComment}>
                <Send className="w-4 h-4" />
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Button size="sm" variant="outline" className="h-9" disabled={uploading} onClick={() => fileInputRef.current?.click()} title="Attach file">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <AuditLog entries={sortedAudit} queryKey={["incidentAudit", incidentId]} />
        </div>
      </div>
      <IncidentFormDialog open={editOpen} onOpenChange={setEditOpen} incident={incident} onSave={handleEditSave} />
    </div>
  );
}

function IField({ label, value, children }) {
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <div className="text-sm font-semibold mt-1 text-slate-800">
        {children ?? (value !== undefined && value !== null && value !== "" ? String(value) : "—")}
      </div>
    </div>
  );
}