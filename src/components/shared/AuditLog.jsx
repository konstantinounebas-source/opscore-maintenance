import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, User, MessageSquare, Paperclip, Download, ChevronDown, ChevronUp, FileText, ImageIcon, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

function AttachmentItem({ url, name }) {
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name || url);
  const displayName = name || url.split("/").pop() || "Attachment";
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
        <a href={url} download={name} title="Download"
          className="p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Download className="h-3.5 w-3.5" />
        </a>
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  // Keep local entry in sync when parent re-fetches (entry prop changes)
  useEffect(() => {
    setEntry(initialEntry);
    setCommentText("");
  }, [initialEntry]);

  const hasAttachments = Array.isArray(entry.attachment_metadata) && entry.attachment_metadata.length > 0;
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
    await base44.entities.IncidentAuditTrail.update(entry.id, {
      comments: [...existingComments, {
        text: commentText,
        author: user?.email,
        author_name: user?.full_name,
        created_at: new Date().toISOString(),
      }],
    });
    await refreshEntry();
    setSaving(false);
    setEditingComment(false);
    setCommentText("");
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
        created_at: new Date().toISOString(),
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
                <Paperclip className="h-3 w-3" /> {entry.attachments.length} file{entry.attachments.length > 1 ? "s" : ""}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entry.attachments.map((url, i) => (
                  <AttachmentItem key={i} url={url} name={entry.attachment_names?.[i]} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No attachments yet.</p>
            )}
          </div>

          {/* Comment section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comment</span>
              {!editingComment && (
                <Button variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => { setCommentText(entry.comment || ""); setEditingComment(true); }}>
                  {hasComment ? "Edit" : "Add Comment"}
                </Button>
              )}
            </div>
            {editingComment ? (
              <div className="space-y-2">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment about this workflow step..."
                  className="text-sm min-h-[80px]" autoFocus />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditingComment(false)}>Cancel</Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveComment} disabled={saving}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : hasComment ? (
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{entry.comment}</p>
            ) : (
              <p className="text-xs text-slate-400">No comment yet.</p>
            )}
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