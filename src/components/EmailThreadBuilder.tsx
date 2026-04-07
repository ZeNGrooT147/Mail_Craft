import { useEffect, useState, useCallback } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Plus, MessageSquare, Trash2, Loader2, ChevronRight, ArrowLeft,
  Send as SendIcon, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Thread {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ThreadMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: string;
  subject: string | null;
  body: string;
  sender: string | null;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

const EmailThreadBuilder = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newThreadName, setNewThreadName] = useState("");
  const [newMsgBody, setNewMsgBody] = useState("");
  const [newMsgRole, setNewMsgRole] = useState<"sent" | "received">("received");
  const [newMsgSender, setNewMsgSender] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("email_threads")
      .select("*")
      .order("updated_at", { ascending: false });
    setThreads((data as Thread[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const fetchMessages = useCallback(async (threadId: string) => {
    setMsgLoading(true);
    const { data } = await supabase
      .from("thread_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages((data as ThreadMessage[]) || []);
    setMsgLoading(false);
  }, []);

  const openThread = (thread: Thread) => {
    setActiveThread(thread);
    fetchMessages(thread.id);
    setAiReply("");
  };

  const createThread = async () => {
    if (!user || !newThreadName.trim()) return;
    const { data, error } = await supabase
      .from("email_threads")
      .insert({ user_id: user.id, name: newThreadName.trim() })
      .select()
      .single();
    if (error) { toast.error("Failed to create thread."); return; }
    setNewThreadName("");
    setThreads((prev) => [data as Thread, ...prev]);
    toast.success("Thread created!");
  };

  const deleteThread = async (id: string) => {
    await supabase.from("email_threads").delete().eq("id", id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeThread?.id === id) { setActiveThread(null); setMessages([]); }
    toast.success("Thread deleted.");
  };

  const addMessage = async () => {
    if (!user || !activeThread || !newMsgBody.trim()) return;
    const { data, error } = await supabase
      .from("thread_messages")
      .insert({
        thread_id: activeThread.id,
        user_id: user.id,
        role: newMsgRole,
        body: newMsgBody.trim(),
        sender: newMsgSender.trim() || (newMsgRole === "sent" ? "You" : ""),
      })
      .select()
      .single();
    if (error) { toast.error("Failed to add message."); return; }
    setMessages((prev) => [...prev, data as ThreadMessage]);
    setNewMsgBody("");
    setNewMsgSender("");
  };

  const generateContextualReply = async () => {
    if (messages.length === 0) { toast.error("Add messages to the thread first."); return; }
    setGenerating(true);
    setAiReply("");

    const conversationContext = messages
      .map((m) => `[${m.role === "sent" ? "You" : m.sender || "Them"}]: ${m.body}`)
      .join("\n\n");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAiHeaders()),
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Here is the email thread:\n\n${conversationContext}\n\nWrite a contextual reply that follows the conversation naturally. Be professional and concise.`,
          }],
          mode: "reply",
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded. Please wait a moment and try again."); return; }
      if (resp.status === 402) { toast.error("AI credits depleted. Please top up in workspace settings."); return; }
      if (!resp.ok || !resp.body) { toast.error("Failed to generate."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; setAiReply(fullText); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch { toast.error("Failed to generate reply."); }
    finally { setGenerating(false); }
  };

  if (!user) return null;

  // Thread detail view
  if (activeThread) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setActiveThread(null); setMessages([]); setAiReply(""); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to threads
        </button>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-foreground">{activeThread.name}</h3>
          <Button variant="outline" size="sm" onClick={generateContextualReply} disabled={generating} className="h-8 gap-1.5 text-xs rounded-xl">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
            {generating ? "Generating…" : "AI Reply"}
          </Button>
        </div>

        {/* Messages */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
          {msgLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add the first email in this thread below.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-2xl p-3.5 border ${
                  msg.role === "sent"
                    ? "bg-primary/5 border-primary/20 ml-8"
                    : "bg-card border-border mr-8"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center ${msg.role === "sent" ? "bg-primary/15" : "bg-secondary"}`}>
                    {msg.role === "sent" ? (
                      <SendIcon className="h-2.5 w-2.5 text-primary" />
                    ) : (
                      <Inbox className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-foreground">
                    {msg.sender || (msg.role === "sent" ? "You" : "Unknown")}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
              </motion.div>
            ))
          )}
        </div>

        {/* AI Reply preview */}
        {aiReply && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-5 w-5 rounded-md bg-primary/15 flex items-center justify-center">
                <MessageSquare className="h-2.5 w-2.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-primary">AI Suggested Reply</span>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{aiReply}</p>
            <Button
              size="sm"
              className="mt-3 h-8 text-xs rounded-xl"
              onClick={async () => {
                if (!user) return;
                await supabase.from("thread_messages").insert({
                  thread_id: activeThread.id,
                  user_id: user.id,
                  role: "sent",
                  body: aiReply,
                  sender: "You",
                });
                setMessages((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), thread_id: activeThread.id, user_id: user.id, role: "sent", body: aiReply, sender: "You", subject: null, created_at: new Date().toISOString() },
                ]);
                setAiReply("");
                toast.success("Reply added to thread!");
              }}
            >
              Add to Thread
            </Button>
          </motion.div>
        )}

        {/* Add message form */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex gap-0.5 p-0.5 rounded-xl bg-secondary/50 border border-border">
              <button
                onClick={() => setNewMsgRole("received")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  newMsgRole === "received" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Received
              </button>
              <button
                onClick={() => setNewMsgRole("sent")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  newMsgRole === "sent" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sent
              </button>
            </div>
            {newMsgRole === "received" && (
              <input
                value={newMsgSender}
                onChange={(e) => setNewMsgSender(e.target.value)}
                placeholder="From…"
                className="flex-1 h-8 bg-background rounded-xl px-3 border border-input text-xs outline-none focus:ring-2 focus:ring-ring/20"
              />
            )}
          </div>
          <textarea
            value={newMsgBody}
            onChange={(e) => setNewMsgBody(e.target.value)}
            placeholder="Paste or type the email content…"
            rows={2}
            className="w-full bg-background rounded-xl border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-ring/20"
          />
          <Button size="sm" onClick={addMessage} disabled={!newMsgBody.trim()} className="h-8 text-xs gap-1.5 rounded-xl">
            <Plus className="h-3 w-3" />
            Add to Thread
          </Button>
        </div>
      </div>
    );
  }

  // Thread list view
  return (
    <div className="space-y-3">
      {/* Create thread */}
      <div className="flex gap-2">
        <input
          value={newThreadName}
          onChange={(e) => setNewThreadName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createThread()}
          placeholder="New thread name…"
          className="flex-1 h-10 bg-background rounded-xl px-3 border border-input text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
        <Button size="sm" onClick={createThread} disabled={!newThreadName.trim()} className="h-10 gap-1.5 rounded-xl">
          <Plus className="h-3.5 w-3.5" />
          Create
        </Button>
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">No threads yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a thread to organize email conversations.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread, i) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-md cursor-pointer transition-all duration-200"
              onClick={() => openThread(thread)}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{thread.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteThread(thread.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailThreadBuilder;



