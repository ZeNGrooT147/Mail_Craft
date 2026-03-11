import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitCompare, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface DraftComparisonProps {
  currentDraft: string;
  onPickDraft: (draft: string) => void;
}

const DraftComparison = ({ currentDraft, onPickDraft }: DraftComparisonProps) => {
  const [altDraft, setAltDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateAlt = async () => {
    if (!currentDraft.trim()) { toast.error("Generate a draft first."); return; }
    setIsLoading(true);
    setAltDraft("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          mode: "ab-draft",
          messages: [{ role: "user", content: `Here is the current email draft:\n\n${currentDraft}` }],
        }),
      });

      if (!resp.ok || !resp.body) { toast.error("Failed to generate variation."); setIsLoading(false); return; }

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
            if (c) { fullText += c; setAltDraft(fullText); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  if (!altDraft && !isLoading) {
      return (
        <button onClick={generateAlt} disabled={!currentDraft.trim()} className="w-full h-12 px-4 rounded-lg font-semibold text-base bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/25">
          <GitCompare className="h-5 w-5" /> Generate A/B Variation
        </button>
      );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">A/B Draft Comparison</span>
          <button onClick={generateAlt} disabled={isLoading} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-all flex items-center gap-1.5 disabled:opacity-50">
            <GitCompare className="h-4 w-4" /> {isLoading ? "Generating…" : "Regenerate"}
          </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Version A</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary" onClick={() => { toast.success("Kept Version A"); setAltDraft(""); }}>
              <Check className="h-3 w-3" /> Keep
            </Button>
          </div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-5">{currentDraft.slice(0, 300)}{currentDraft.length > 300 ? "…" : ""}</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">Version B</span>
            {altDraft && !isLoading && (
                <button className="h-8 px-2 text-xs font-semibold gap-1 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-all flex items-center" onClick={() => { onPickDraft(altDraft); setAltDraft(""); toast.success("Switched to Version B"); }}>
                  <Check className="h-4 w-4" /> Use this
                </button>
            )}
          </div>
          {isLoading && !altDraft ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-2"><Loader2 className="h-3 w-3 animate-spin" /> Generating…</div>
          ) : (
            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-6">{altDraft.slice(0, 400)}{altDraft.length > 400 ? "…" : ""}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftComparison;
