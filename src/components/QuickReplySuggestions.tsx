import { useState, useCallback } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { readSseText } from "@/lib/sse";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface QuickReplySuggestionsProps {
  emailText: string;
  onSelectReply: (reply: string) => void;
}

const QuickReplySuggestions = ({ emailText, onSelectReply }: QuickReplySuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!emailText.trim()) { toast.error("No email to reply to."); return; }
    setLoading(true);
    setSuggestions([]);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAiHeaders()),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: emailText }],
          mode: "quick-replies",
        }),
      });
      if (resp.status === 429) { toast.error("Rate limit exceeded."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) { toast.error("Failed to generate."); return; }

      const full = await readSseText(resp);
      const lines = full.split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      setSuggestions(lines.slice(0, 3));
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(false); }
  }, [emailText]);

  if (!emailText.trim()) return null;

  return (
    <div className="space-y-2">
      {suggestions.length === 0 ? (
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={loading}
          className="h-7 text-[11px] gap-1"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Quick Reply Ideas
        </Button>
      ) : (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick replies</span>
          <div className="flex flex-col gap-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSelectReply(s)}
                className="text-left text-xs px-2.5 py-2 rounded-md border border-border bg-background hover:bg-secondary/50 text-foreground/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickReplySuggestions;



