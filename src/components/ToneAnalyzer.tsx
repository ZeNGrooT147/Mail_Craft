import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface ToneScore {
  formality: number;
  friendliness: number;
  confidence: number;
  urgency: number;
  label: string;
}

interface ToneAnalyzerProps {
  text: string;
  triggerKey?: number;
}

const meterColors: Record<string, string> = {
  formality: "bg-primary",
  friendliness: "bg-emerald-500",
  confidence: "bg-amber-500",
  urgency: "bg-destructive",
};

const meterLabels: Record<string, [string, string]> = {
  formality: ["Casual", "Formal"],
  friendliness: ["Cold", "Warm"],
  confidence: ["Tentative", "Assertive"],
  urgency: ["Relaxed", "Urgent"],
};

const ToneAnalyzer = ({ text, triggerKey }: ToneAnalyzerProps) => {
  const [score, setScore] = useState<ToneScore | null>(null);
  const [loading, setLoading] = useState(false);
  const lastTrigger = useRef<number | undefined>(undefined);

  const analyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          mode: "tone-analysis",
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) { toast.error("Failed to analyze tone."); return; }

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
            if (content) fullText += content;
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      const nums = fullText.match(/\d+/g)?.map(Number) || [];
      setScore({
        formality: Math.min(100, Math.max(0, nums[0] ?? 50)),
        friendliness: Math.min(100, Math.max(0, nums[1] ?? 50)),
        confidence: Math.min(100, Math.max(0, nums[2] ?? 50)),
        urgency: Math.min(100, Math.max(0, nums[3] ?? 30)),
        label: fullText.split("\n").pop()?.replace(/[^a-zA-Z\s,]/g, "").trim() || "Neutral",
      });
    } catch {
      toast.error("Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [text]);

  // Auto-run when triggerKey changes
  useEffect(() => {
    if (triggerKey !== undefined && triggerKey !== lastTrigger.current && text.trim()) {
      lastTrigger.current = triggerKey;
      analyze();
    }
  }, [triggerKey, analyze, text]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        Analyzing tone…
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">{score.label}</span>
      </div>
      {(["formality", "friendliness", "confidence", "urgency"] as const).map((key) => (
        <div key={key} className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{meterLabels[key][0]}</span>
            <span className="font-medium text-foreground/70 capitalize">{key} · {score[key]}%</span>
            <span>{meterLabels[key][1]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${meterColors[key]}`}
              style={{ width: `${score[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToneAnalyzer;
