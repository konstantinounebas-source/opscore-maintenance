import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, User, MessageSquare, Paperclip, Download, Upload, ChevronDown, ChevronUp, FileText, Image } from "lucide-react";
import { format } from "date-fns";

function AttachmentItem({ url, name }) {
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name || url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-slate-700 group"
    >
      {isImage ? <Image className="h-3.5 w-3.5 text-slate-400" /> : <FileText className="h-3.5 w-3.5 text-slate-400" />}
      <span className="truncate max-w-[160px]">{name || "Attachment"}</span>
      <Download className="h-3.5 w-3.5 text-slate-400 ml-auto group-hover:text-indigo-600" />
    </a>
  );
}

function AuditEntry({ entry, queryKey }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(entry.comment || "");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef();

  const updateEntry = useMutation({
    mutationFn: (data) => base44.entities.IncidentAuditTrail.update(entry.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditing(false);
    }
  });

  const handleSaveComment = () => {
    updateEntry.mutate({ comment });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existingUrls = entry.attachments || [];
    const existingNames = entry.attachment_names || [];
    updateEntry.mutate({
      attachments: [...existingUrls, file_url],
      attachment_names: [...existingNames, file.name]
    });
    setUploading(false);
    e.target.value = "";
  };

  const hasAttachments = entry.attachments && entry.attachments.length > 0;
  const hasComment = entry.comment && entry.comment.trim() !== "";

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{entry.action}</p>
          {entry.details && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{entry.details}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
            {entry.user && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{entry.user}
              </span>
            )}
            {entry.created_date && (
              <span>{format(new Date(entry.created_date), "MMM d, yyyy HH:mm")}</span>
            )}
            {hasComment && (
              <span className="flex items-center gap-1 text-indigo-500">
                <MessageSquare className="h-3 w-3" /> Comment
              </span>
            )}
            {hasAttachments && (
              <span className="flex items-center gap-1 text-indigo-500">
                <Paperclip className="h-3 w-3" /> {entry.attachments.length} file{entry.attachments.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-1" />}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Attachments</span>
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
            {hasAttachments ? (
              <div className="flex flex-wrap gap-2">
                {entry.attachments.map((url, i) => (
                  <AttachmentItem key={i} url={url} name={entry.attachment_names?.[i]} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No attachments yet.</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Comment</span>
              {!editing && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>
                  {hasComment ? "Edit" : "Add Comment"}
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Write a comment about this workflow step..."
                  className="text-sm min-h-[80px]"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setComment(entry.comment || ""); }}>Cancel</Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveComment} disabled={updateEntry.isPending}>
                    {updateEntry.isPending ? "Saving..." : "Save"}
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