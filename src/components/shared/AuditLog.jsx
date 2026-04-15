import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { getAthensTimestamp } from "@/lib/timeSync";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, MessageSquare, Paperclip, Download, ChevronDown, ChevronUp, FileText, ImageIcon, Eye, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Parse a "form:submissionId:formType" virtual URL
function parseFormRef(url) {
  if (!url || !url.startsWith("form:")) return null;
  const parts = url.split(":");
  return { submissionId: parts[1], formType: parts[2] };
}

function FormRefItem({ submissionId, formType, name }) {
  const [downloading, setDownloading] = useState(false);

  const handleOpenForm = () => {
    console.log("[AuditLog.FormRefItem] Opening form:", submissionId, "formType:", formType);
    window.open(`/Forms?submissionId=${submissionId}`, "_blank");
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      console.log("[AuditLog.FormRefItem.handleDownload] Starting download for submission:", submissionId);
      const { appId, token, functionsVersion, appBaseUrl } = appParams;
      const baseUrl = appBaseUrl || `https://appfunctions.base44.com`;
      const fetchUrl = `${baseUrl}/api/apps/${appId}/functions/generateFormPDF`;
      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(functionsVersion ? { 'X-Functions-Version': functionsVersion } : {}),
        },
        body: JSON.stringify({ submissionId }),
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error("[AuditLog.FormRefItem.handleDownload] HTTP error:", res.status, errText);
        toast.error(`PDF generation failed: ${errText}`);
        return;
      }
      
      const contentType = res.headers.get('content-type');
      console.log("[AuditLog.FormRefItem.handleDownload] Content-type:", contentType);
      
      const blob = await res.blob();
      console.log("[AuditLog.FormRefItem.handleDownload] Blob size:", blob.size);
      
      if (blob.size === 0) {
        toast.error("PDF generation returned empty file");
        return;
      }
      
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${(name || 'form').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      console.log("[AuditLog.FormRefItem.handleDownload] Download completed");
    } catch (err) {
      console.error("[AuditLog.FormRefItem.handleDownload] Error:", err);
      toast.error(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50">
      <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
      <span className="truncate max-w-[140px] text-xs text-indigo-700 font-medium" title={name}>{name || "Form Submission"}</span>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={handleOpenForm} title="View Form in editor"
          className="p-1 rounded hover:bg-indigo-200 text-indigo-400 hover:text-indigo-700 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleDownload} disabled={downloading} title="Download as PDF"
          className="p-1 rounded hover:bg-indigo-200 text-indigo-400 hover:text-indigo-700 transition-colors disabled:opacity-50">
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function AttachmentItem({ url, name }) {
  const formRef = parseFormRef(url);

  if (formRef) {
    console.log("[AuditLog.AttachmentItem] Parsed form reference:", formRef);
    return <FormRefItem submissionId={formRef.submissionId} formType={formRef.formType} name={name} />;
  }

  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name || url);
  const displayName = name || url.split("/").pop() || "Attachment";

  const handleDownload = async (e) => {
    e.preventDefault();
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = displayName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
      {isImage
        ? <ImageIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        : <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      }
      <span className="truncate max-w-[160px] text-xs text-slate-700">{displayName}</span>
      <div className="flex items-center gap-1 ml-auto">
        <a href={url} target="_blank" rel="noopener noreferrer" title="View"
          className="p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Eye className="h-3.5 w-3.5" />
        </a>
        <button onClick={handleDownload} title="Download"
          className="p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AuditEntry({ entry: initialEntry, queryKey }) {
  const queryClient = useQueryClient();
  const [entry, setEntry] = useState(initialEntry);
  const [expanded, setExpanded] = useState(false);
  const [editingComment, setEditingComment] = useState(false);
  const [commentText, setCommentText] = useState(initialEntry.comment || "");
  const [commentPersonInputType, setCommentPersonInputType] = useState("manual");
  const [commentPerson, setCommentPerson] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  // Fetch person names from config lists
  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(item => item.value);
    },
  });

  // Keep local entry in sync when parent re-fetches (entry prop changes)
  useEffect(() => {
    setEntry(initialEntry);
    setCommentText("");
  }, [initialEntry]);

  const hasAttachments = (Array.isArray(entry.attachment_metadata) && entry.attachment_metadata.length > 0) || (Array.isArray(entry.attachments) && entry.attachments.length > 0);
  const hasComments = Array.isArray(entry.comments) && entry.comments.length > 0;

  const refreshEntry = async () => {
    // Re-fetch just this entry directly from the API
    const updated = await base44.entities.IncidentAuditTrail.filter({ incident_id: entry.incident_id });
    const fresh = updated.find(e => e.id === entry.id);
    if (fresh) setEntry(fresh);
    // Also invalidate parent list
    queryClient.invalidateQueries({ queryKey });
  };

  const handleSaveComment = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const existingComments = entry.comments || [];
    const commentAuthor = commentPerson || user?.email;
    const commentAuthorName = commentPerson || user?.full_name;
    
    await base44.entities.IncidentAuditTrail.update(entry.id, {
      comments: [...existingComments, {
        text: commentText,
        author: commentAuthor,
        author_name: commentAuthorName,
        created_at: getAthensTimestamp(),
      }],
    });
    await refreshEntry();
    setSaving(false);
    setEditingComment(false);
    setCommentText("");
    setCommentPerson("");
    setCommentPersonInputType("manual");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const user = await base44.auth.me();
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existingMeta = entry.attachment_metadata || [];
    await base44.entities.IncidentAuditTrail.update(entry.id, {
      attachment_metadata: [...existingMeta, {
        url: file_url,
        name: file.name,
        author: user?.email,
        author_name: user?.full_name,
        created_at: getAthensTimestamp(),
      }],
    });
    await refreshEntry();
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Header row — always visible */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="mt-0.5 h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{entry.action}</p>
          {entry.details && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{entry.details}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
            {entry.user && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{entry.user}
              </span>
            )}
            {entry.created_date && (
              <span>{format(new Date(entry.created_date), "MMM d, yyyy HH:mm")}</span>
            )}
            {hasComments && (
              <span className="flex items-center gap-1 text-indigo-500">
                <MessageSquare className="h-3 w-3" /> {entry.comments.length} comment{entry.comments.length > 1 ? "s" : ""}
              </span>
            )}
            {hasAttachments && (
              <span className="flex items-center gap-1 text-indigo-500">
                <Paperclip className="h-3 w-3" /> {(entry.attachment_metadata?.length || 0) + (entry.attachments?.length || 0)} file{((entry.attachment_metadata?.length || 0) + (entry.attachments?.length || 0)) > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
          : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
        }
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

          {/* Attachments section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attachments</span>
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                  {uploading ? "Uploading..." : "Attach File"}
                </Button>
              </div>
            </div>
            {hasAttachments ? (
              <div className="space-y-2">
                {entry.attachment_metadata?.map((meta, i) => (
                  <div key={`meta-${i}`} className="space-y-1">
                    <AttachmentItem url={meta.url} name={meta.name} />
                    <div className="text-xs text-slate-400 ml-1">
                      {meta.author_name || meta.author} • {meta.created_at ? format(new Date(meta.created_at), "MMM d, HH:mm") : ""}
                    </div>
                  </div>
                ))}
                {entry.attachments?.map((url, i) => (
                  <div key={`legacy-${i}`} className="space-y-1">
                    <AttachmentItem url={url} name={entry.attachment_names?.[i]} />
                    <div className="text-xs text-slate-400 ml-1">
                      {entry.user || "System"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No attachments yet.</p>
            )}
          </div>

          {/* Comments section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</span>
              {!editingComment && (
                <Button variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => { setEditingComment(true); }}>
                  Add Comment
                </Button>
              )}
            </div>
            {editingComment ? (
              <div className="space-y-2 mb-3">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment about this workflow step..."
                  className="text-sm min-h-[80px]" autoFocus />
                
                <div className="space-y-2 border-t pt-2">
                  <Label className="text-xs font-semibold">Comment Author</Label>
                  <Tabs value={commentPersonInputType} onValueChange={setCommentPersonInputType}>
                    <TabsList className="grid w-full grid-cols-2 h-7">
                      <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
                      <TabsTrigger value="select" className="text-xs">From List</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="mt-2">
                      <Input
                        placeholder="Enter person name..."
                        value={commentPerson}
                        onChange={e => setCommentPerson(e.target.value)}
                        className="text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="select" className="mt-2">
                      <Select value={commentPerson} onValueChange={setCommentPerson}>
                        <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                        <SelectContent>
                          {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setEditingComment(false); setCommentText(""); setCommentPerson(""); setCommentPersonInputType("manual"); }}>Cancel</Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveComment} disabled={saving || !commentText.trim() || !commentPerson.trim()}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : null}
            {hasComments ? (
              <div className="space-y-2">
                {entry.comments.map((cmt, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">{cmt.author_name || cmt.author}</span>
                      <span className="text-xs text-slate-400">{format(new Date(cmt.created_at), "MMM d, HH:mm")}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{cmt.text}</p>
                  </div>
                ))}
              </div>
            ) : !editingComment ? (
              <p className="text-xs text-slate-400">No comments yet.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLog({ entries = [], queryKey = ["auditTrail"] }) {
  if (!entries.length) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No audit trail entries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <AuditEntry key={entry.id} entry={entry} queryKey={queryKey} />
      ))}
    </div>
  );
}