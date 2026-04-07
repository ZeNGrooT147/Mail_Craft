import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface GrammarCheckProps {
  emailBody: string;
  triggerKey?: number;
}

interface Finding {
  type: "success" | "warning" | "info";
  text: string;
}

const parseFindingsFromMarkdown = (md: string): Finding[] => {
  const lines = md.split("\n").filter((l) => l.trim());
  const findings: Finding[] = [];
  for (const line of lines) {
    const clean = line.replace(/^[#*\-•\d.)\s]+/, "").replace(/\*\*/g, "").trim();
    if (!clean || clean.length < 5) continue;
    const lower = clean.toLowerCase();
    if (lower.includes("no issue") || lower.includes("looks good") || lower.includes("well-written") || lower.includes("no error") || lower.includes("correct") || lower.includes("✅") || lower.includes("great")) {
      findings.push({ type: "success", text: clean });
    } else if (lower.includes("consider") || lower.includes("suggest") || lower.includes("could") || lower.includes("might") || lower.includes("alternatively") || lower.includes("tip")) {
      findings.push({ type: "info", text: clean });
    } else {
      findings.push({ type: "warning", text: clean });
    }
  }
  return findings.length > 0 ? findings : [{ type: "info", text: md.replace(/[#*]/g, "").trim() }];
};

const GrammarCheck = ({ emailBody, triggerKey }: GrammarCheckProps) => {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastTrigger = useRef<number | undefined>(undefined);

  const checkGrammar = async () => {
    if (!emailBody.trim()) return;
    setIsLoading(true);
    setResult("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          mode: "grammar-check",
          messages: [{ role: "user", content: `Please review this email:\n\n${emailBody}` }],
        }),
      });

      if (!resp.ok || !resp.body) { toast.error("Failed to check grammar."); setIsLoading(false); return; }

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
            if (c) { fullText += c; setResult(fullText); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (triggerKey !== undefined && triggerKey !== lastTrigger.current && emailBody.trim()) {
      lastTrigger.current = triggerKey;
      checkGrammar();
    }
  }, [triggerKey, emailBody]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        Analyzing writing…
      </div>
    );
  }

  if (!result) return null;

  const findings = parseFindingsFromMarkdown(result);

  const iconMap = {
    success: <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />,
    info: <Info className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />,
  };

  const bgMap = {
    success: "bg-emerald-500/8 border-emerald-500/15",
    warning: "bg-amber-500/8 border-amber-500/15",
    info: "bg-blue-500/8 border-blue-500/15",
  };

  return (
    <div className="space-y-3 pb-1">
      {findings.slice(0, 6).map((f, i) => (
        <div key={i} className={`flex items-start gap-2.5 rounded-lg border p-3 ${bgMap[f.type]} transition-all hover:shadow-md`}>
          {iconMap[f.type]}
          <span className="text-sm text-foreground/85 leading-relaxed">{f.text}</span>
        </div>
      ))}
    </div>
  );
};

export default GrammarCheck;
