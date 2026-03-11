import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, ListChecks, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface EmailSummarizerProps {
  emailText: string;
}

const EmailSummarizer = ({ emailText }: EmailSummarizerProps) => {
  const [summary, setSummary] = useState("");
  const [actions, setActions] = useState("");
  const [loading, setLoading] = useState<"summary" | "actions" | null>(null);
  const [open, setOpen] = useState(true);

  const callAI = useCallback(async (mode: string, setter: (val: string) => void) => {
    if (!emailText.trim()) { toast.error("No email to analyze."); return; }
    setLoading(mode as any);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: emailText }],
          mode,
        }),
      });
      if (!resp.ok || !resp.body) { toast.error("Failed to analyze."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") return;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { full += c; setter(full); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(null); }
  }, [emailText]);

  if (!emailText.trim()) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-lg bg-secondary/20">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Email Analysis
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-2">
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => callAI("summarize", setSummary)}
            disabled={!!loading}
            className="h-7 text-[11px] gap-1"
          >
            {loading === "summary" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            TL;DR
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => callAI("extract-actions", setActions)}
            disabled={!!loading}
            className="h-7 text-[11px] gap-1"
          >
            {loading === "actions" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListChecks className="h-3 w-3" />}
            Extract Actions
          </Button>
        </div>
        {summary && (
          <div className="rounded-md bg-background border border-border p-2.5 text-xs text-foreground/80 leading-relaxed">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Summary</span>
            {summary}
          </div>
        )}
        {actions && (
          <div className="rounded-md bg-background border border-border p-2.5 text-xs text-foreground/80 leading-relaxed">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Action Items</span>
            {actions}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default EmailSummarizer;
