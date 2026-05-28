import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2, CheckCircle2, MessageCircle } from "lucide-react";

export default function SendToFieldWorkerDialog({ incident, incidentId, onClose }) {
  const { toast } = useToast();
  const [chatId, setChatId] = useState("");
  const [formType, setFormType] = useState("make_safe");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");

  const handleSend = async () => {
    if (!chatId.trim()) {
      toast({ title: "Please enter a Telegram Chat ID" });
      return;
    }

    setSending(true);
    try {
      const res = await base44.functions.invoke('sendTelegramFormLink', {
        chatId: chatId.trim(),
        formType,
        incidentId,
        incidentRef: incident?.incident_id,
        assetName: incident?.related_asset_name,
      });

      if (res.data?.success) {
        setSent(true);
        setGeneratedUrl(res.data.formUrl);
        toast({ title: "Form link sent successfully via Telegram!" });
      } else {
        const errMsg = res.data?.error || "Unknown error";
        const isChatNotFound = errMsg.toLowerCase().includes("chat not found");
        toast({
          title: "Failed to send",
          description: isChatNotFound
            ? "Chat not found. The worker must open Telegram, search for your bot, and send it any message first — then try again."
            : errMsg,
          variant: "destructive",
          duration: 8000,
        });
      }
    } catch (err) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            Send Form to Field Worker
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-sm font-medium text-green-700 text-center">Form link sent via Telegram!</p>
              <p className="text-xs text-slate-500 text-center">
                The field worker will receive a Telegram message with a link to complete the form.
              </p>
            </div>
            {generatedUrl && (
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Form URL (for reference):</p>
                <p className="text-xs text-blue-600 break-all">{generatedUrl}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSent(false); setGeneratedUrl(""); }}>Send Another</Button>
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <p className="font-semibold mb-1">How it works:</p>
              <p>The field worker receives a Telegram message with a link. They open it on their mobile browser and complete the form without needing to log in.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Incident</Label>
              <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
                {incident?.incident_id} — {incident?.title}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Form Type *</Label>
              <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="make_safe">🛡️ Make-Safe Checklist</SelectItem>
                <SelectItem value="corrective">🔧 Corrective Work Order Checklist</SelectItem>
                <SelectItem value="inspection">📋 Inspection WO Checklist</SelectItem>
              </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telegram Chat ID *</Label>
              <Input
                placeholder="e.g. 123456789"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-slate-400">
                Must be the <strong>numeric</strong> Chat ID. To find it: have the worker send any message to the bot, then visit{" "}
                <code className="bg-slate-100 px-1 rounded">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>{" "}
                and look for <code className="bg-slate-100 px-1 rounded">chat.id</code>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !chatId.trim()}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send via Telegram
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}