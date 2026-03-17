import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import AuditLog from "@/components/shared/AuditLog";
import FileUploader from "@/components/shared/FileUploader";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import IncidentWorkflow from "@/components/incidents/IncidentWorkflow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Pencil, FileText, Image, ExternalLink, Send, MessageSquare, StickyNote } from "lucide-react";

export default function IncidentDetail() {
  const params = new URLSearchParams(window.location.search);
  const incidentId = params.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState("Comment");

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

  const handleStatusChange = (newStatus) => {
    setPendingChanges(prev => ({ ...prev, status: newStatus }));
    setStatusAction("");
  };

  const handleAssign = async () => {
    if (!assignee.trim()) return;
    setPendingChanges(prev => ({ ...prev, assigned_to: assignee }));
    setAssignee("");
  };

  const handlePriority = (newPriority) => {
    setPendingChanges(prev => ({ ...prev, priority: newPriority }));
    setPriorityAction("");
  };

  const handleConfirmChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }

    const user = await base44.auth.me();
    const updates = {};
    const auditEntries = [];

    for (const [key, newValue] of Object.entries(pendingChanges)) {
      const oldValue = incident[key];
      updates[key] = newValue;

      if (key === "status") {
        auditEntries.push({ action: "Status Changed", details: `${oldValue} → ${newValue}` });
      } else if (key === "assigned_to") {
        auditEntries.push({ action: "Assigned", details: `Assigned to ${newValue}` });
      } else if (key === "priority") {
        auditEntries.push({ action: "Priority Changed", details: `${oldValue} → ${newValue}` });
      }
    }

    await base44.entities.Incidents.update(incidentId, updates);
    for (const entry of auditEntries) {
      await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action: entry.action, details: entry.details, user: user?.email });
    }

    setPendingChanges({});
    invalidateAll();
    toast({ title: "Changes confirmed and logged" });
  };

  const handleUpload = async (fileData) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAttachments.create({ ...fileData, incident_id: incidentId, uploaded_by: user?.email });
    await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action: "Attachment Uploaded", details: `${fileData.file_type || "File"}: ${fileData.file_name}`, user: user?.email });
    invalidateAll();
    toast({ title: "File uploaded" });
  };

  if (!incident) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const sortedComments = [...comments].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-xs text-slate-500 font-medium">Incident ID</p><p className="text-sm font-semibold mt-1">{incident.incident_id}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Related Asset</p><p className="text-sm font-semibold mt-1">{incident.related_asset_name || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Status</p><div className="mt-1"><StatusBadge status={incident.status} /></div></div>
            <div><p className="text-xs text-slate-500 font-medium">Priority</p><div className="mt-1"><StatusBadge status={incident.priority} /></div></div>
            <div><p className="text-xs text-slate-500 font-medium">Category</p><p className="text-sm font-semibold mt-1">{incident.category || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Reported Date</p><p className="text-sm font-semibold mt-1">{incident.reported_date || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Assigned To</p><p className="text-sm font-semibold mt-1">{incident.assigned_to || "—"}</p></div>
            <div><p className="text-xs text-slate-500 font-medium">Created</p><p className="text-sm font-semibold mt-1">{incident.created_date ? format(new Date(incident.created_date), "MMM d, yyyy") : "—"}</p></div>
          </div>
          {incident.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700">{incident.description}</p>
            </div>
          )}
        </div>

        {/* Workflow */}
        <IncidentWorkflow incident={incident} incidentId={incidentId} onRefresh={invalidateAll} />

        <Tabs defaultValue="comments" className="space-y-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="comments">Comments / Notes ({comments.length})</TabsTrigger>
            <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail ({auditTrail.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="comments">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex gap-2">
                <Select value={commentType} onValueChange={setCommentType}>
                  <SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Comment">Comment</SelectItem>
                    <SelectItem value="Note">Note</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment or note..." className="flex-1 min-h-[40px] text-sm" rows={2} />
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 self-end" onClick={handleAddComment}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3 pt-2">
                {sortedComments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>}
                {sortedComments.map(c => (
                  <div key={c.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.comment_type === "Note" ? "bg-amber-100" : "bg-indigo-100"}`}>
                      {c.comment_type === "Note" ? <StickyNote className="w-3.5 h-3.5 text-amber-600" /> : <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{c.author || c.created_by || "Unknown"}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${c.comment_type === "Note" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>{c.comment_type}</span>
                        <span className="text-xs text-slate-400">{c.created_date ? format(new Date(c.created_date), "MMM d, yyyy HH:mm") : ""}</span>
                      </div>
                      <p className="text-sm text-slate-700">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attachments">
            <div className="flex justify-end mb-3">
              <FileUploader onUpload={handleUpload} label="Upload Attachment" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y">
              {attachments.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">No attachments</p>}
              {attachments.map(att => (
                <div key={att.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {att.file_type === "Photo" ? <Image className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{att.file_name}</p>
                      <p className="text-xs text-slate-400">{att.uploaded_by || "—"} · {att.created_date ? format(new Date(att.created_date), "MMM d, yyyy") : "—"}</p>
                    </div>
                  </div>
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700"><ExternalLink className="w-4 h-4" /></a>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <AuditLog entries={sortedAudit} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <IncidentFormDialog open={editOpen} onOpenChange={setEditOpen} incident={incident} onSave={handleEditSave} />
    </div>
  );
}