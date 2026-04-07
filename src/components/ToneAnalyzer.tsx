import { useState, useCallback, useEffect, useRef } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
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
  const lastAnalyzedText = useRef("");

  const analyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAiHeaders()),
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

      const lines = fullText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const parseScore = (line?: string, fallback = 50) => {
        if (!line) return fallback;
        const n = Number((line.match(/\d+/)?.[0] ?? ""));
        if (!Number.isFinite(n)) return fallback;
        return Math.min(100, Math.max(0, n));
      };

      const formality = parseScore(lines[0], 50);
      const friendliness = parseScore(lines[1], 50);
      const confidence = parseScore(lines[2], 50);
      const urgency = parseScore(lines[3], 30);
      const labelCandidate = (lines[4] || "").replace(/[^a-zA-Z\s&,-]/g, "").trim();
      const labelFromScores =
        formality >= 70
          ? (friendliness >= 60 ? "Professional & Warm" : "Formal & Direct")
          : (friendliness >= 65 ? "Casual & Friendly" : "Neutral");

      setScore({
        formality,
        friendliness,
        confidence,
        urgency,
        label: labelCandidate || labelFromScores,
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

  // Auto-run on draft text changes so tone does not stay stale between generations.
  useEffect(() => {
    const normalized = text.trim();
    if (!normalized) {
      setScore(null);
      lastAnalyzedText.current = "";
      return;
    }

    if (normalized === lastAnalyzedText.current) return;

    const timer = window.setTimeout(() => {
      if (normalized !== lastAnalyzedText.current) {
        lastAnalyzedText.current = normalized;
        analyze();
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [text, analyze]);

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
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-4 border border-primary/20">
        <div className="text-sm text-muted-foreground mb-1">Overall Tone</div>
        <div className="text-2xl font-bold text-primary font-display">{score.label}</div>
      </div>
      {(["formality", "friendliness", "confidence", "urgency"] as const).map((key) => (
        <div key={key} className="space-y-2.5 pb-3 border-b border-border/40 last:border-0 last:pb-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base capitalize text-foreground">{key}</span>
            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{score[key]}%</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground/70 mb-1">
            <span className="font-medium">{meterLabels[key][0]}</span>
            <span className="font-medium">{meterLabels[key][1]}</span>
          </div>
          <div className="h-3 rounded-full bg-secondary/60 overflow-hidden border border-border/30 shadow-sm">
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



