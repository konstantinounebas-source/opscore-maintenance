import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENT_NAME = "maintenance_assistant";

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-indigo-600" />
        </div>
      )}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
        isUser
          ? "bg-indigo-600 text-white rounded-br-sm"
          : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
      )}>
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    setStarting(true);
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: "Maintenance Chat" }
    });
    setConversation(conv);
    setMessages([]);
    setStarting(false);

    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    await base44.agents.addMessage(conversation, { role: "user", content: text });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
            <Bot className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">Maintenance Assistant</h1>
            <p className="text-xs text-slate-500">Ask me about assets, incidents, or work orders</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startConversation} className="gap-2">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
        {starting ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <Bot className="h-7 w-7 text-indigo-600" />
            </div>
            <p className="text-slate-600 font-medium">How can I help you today?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-w-md w-full">
              {[
                "Show me all open incidents",
                "List critical priority assets",
                "Create a new incident for AST-001",
                "What work orders are in progress?"
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.filter(m => m.role !== "system").map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about assets, incidents, work orders..."
            disabled={loading || starting}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading || starting}
            className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}