import { useState, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface SubjectLineSuggestionsProps {
  emailBody: string;
  context: string;
  onSelectSubject: (subject: string) => void;
  triggerKey?: number;
}

const SubjectLineSuggestions = ({ emailBody, context, onSelectSubject, triggerKey }: SubjectLineSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastTrigger = useRef<number | undefined>(undefined);

  const generateSubjects = async () => {
    const content = emailBody || context;
    if (!content.trim()) return;
    setIsLoading(true);
    setSuggestions([]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          mode: "subject-lines",
          messages: [{ role: "user", content: `Generate subject lines for this email:\n\n${content}` }],
        }),
      });

      if (!resp.ok || !resp.body) { toast.error("Failed to generate."); setIsLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      const lines = fullText.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter((l) => l.length > 3);
      setSuggestions(lines.slice(0, 5));
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (triggerKey !== undefined && triggerKey !== lastTrigger.current) {
      lastTrigger.current = triggerKey;
      generateSubjects();
    }
  }, [triggerKey]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        Generating subjects…
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => { onSelectSubject(s); toast.success("Subject applied!"); }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-base text-left transition-all duration-200 border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-foreground/85 hover:text-foreground hover:shadow-md group font-medium"
        >
          <span className="truncate pr-2">{s}</span>
          <Check className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
        </button>
      ))}
    </div>
  );
};

export default SubjectLineSuggestions;
