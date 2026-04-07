import { useState, useEffect, useRef } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { readSseText } from "@/lib/sse";
import { Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface GrammarCheckProps {
  emailBody: string;
  triggerKey?: number;
}

interface Finding {
  type: "success" | "warning" | "info";
  category?: string;
  severity?: "high" | "medium" | "low";
  rewrite?: string;
  why?: string;
  text: string;
}

const isJsonNoiseLine = (line: string) =>
  /^```(?:json)?$/i.test(line) ||
  /^[\[\]{}",]+$/.test(line) ||
  /^"?(items|overall)"?\s*:\s*\[?\s*$/i.test(line) ||
  /^"?(items|overall)"?\s*:\s*"?.*$/i.test(line) ||
  /^json$/i.test(line);

const extractJsonField = (line: string, field: string) => {
  const re = new RegExp(`^"?${field}"?\\s*:\\s*"?(.+?)"?[,]?$`, "i");
  const m = line.match(re);
  return m?.[1]?.trim();
};

const isCoachGarbageOutput = (raw: string, parsed: Finding[]) => {
  if (!raw.trim()) return true;
  if (parsed.length === 0) return true;
  return parsed.every((f) => {
    const t = f.text.trim().toLowerCase();
    return t === "items" || t === "overall" || /^"?(items|overall)"?\s*:/.test(t);
  });
};

const isCoachWeakOutput = (parsed: Finding[]) => {
  if (parsed.length < 2) return true;
  const actionable = parsed.filter((f) => f.type !== "success");
  if (actionable.length < 2) return true;
  // Coach output is only useful when we have concrete rewrites and reasons.
  return actionable.some((f) => !f.rewrite || !f.why);
};

const buildCoachFallback = (emailBody: string): string => {
  const text = emailBody.trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const firstSentence = sentences[0] || text;
  const hasGreeting = /^(hi|hello|dear|good\s+(morning|afternoon|evening))\b/i.test(text);
  const hasSignoff = /(thanks|regards|sincerely|best|warm regards)\b/i.test(text);
  const hasQuestion = /\?/.test(text);

  return [
    `[Clarity] [Medium] Issue: Opening sentence can be more direct and outcome-focused. | Rewrite: ${firstSentence.replace(/\s+/g, " ").trim()} Please confirm the key next step by end of day. | Why: A clear action-oriented opener improves readability and response rate.`,
    `[Professionalism] [${hasGreeting && hasSignoff ? "Low" : "High"}] Issue: Greeting or sign-off may be incomplete for a business email. | Rewrite: Hi [Name],\n\n${text}\n\nBest regards,\n[Your Name] | Why: Proper etiquette makes the message sound complete and professional.`,
    `[Tone] [${hasQuestion ? "Low" : "Medium"}] Issue: Tone can be softened while staying confident. | Rewrite: Please review the update and let me know if any adjustments are needed. | Why: Collaborative language keeps the email professional without sounding abrupt.`,
  ].join("\n");
};

const parseFindingsFromMarkdown = (md: string): Finding[] => {
  // Preferred path: strict JSON from backend prompt.
  const jsonCandidate = md.match(/\{[\s\S]*\}/)?.[0];
  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate) as {
        overall?: string;
        items?: Array<{
          category?: string;
          severity?: string;
          issue?: string;
          rewrite?: string;
          why?: string;
        }>;
      };

      const jsonFindings: Finding[] = (parsed.items || [])
        .filter((item) => (item.issue || "").trim().length > 3)
        .map((item) => {
          const severityText = (item.severity || "medium").toLowerCase();
          const severity: "high" | "medium" | "low" =
            severityText === "high" || severityText === "low" ? severityText : "medium";
          const type: Finding["type"] = severity === "high" ? "warning" : "info";
          return {
            type,
            category: item.category?.trim(),
            severity,
            text: (item.issue || "").trim(),
            rewrite: (item.rewrite || "").trim(),
            why: (item.why || "").trim(),
          };
        })
        .slice(0, 6);

      if (jsonFindings.length > 0) {
        const overall = (parsed.overall || "").trim();
        if (overall) {
          const summaryFinding: Finding = { type: "success", text: overall };
          return [summaryFinding, ...jsonFindings].slice(0, 6);
        }
        return jsonFindings;
      }
    } catch {
      // Fall through to legacy parsing.
    }
  }

  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const findings: Finding[] = [];
  let partialOverall = "";
  let partialItem: Partial<Finding> = {};

  for (const line of lines) {
    const clean = line.replace(/^[#*\-•\d.)\s]+/, "").replace(/\*\*/g, "").trim();
    if (!clean || clean.length < 5) continue;
    if (isJsonNoiseLine(clean)) continue;

    const overall = extractJsonField(clean, "overall");
    if (overall) {
      partialOverall = overall;
      continue;
    }

    const category = extractJsonField(clean, "category");
    if (category) {
      partialItem.category = category;
      continue;
    }

    const severity = extractJsonField(clean, "severity")?.toLowerCase();
    if (severity) {
      partialItem.severity = severity === "high" || severity === "low" ? severity : "medium";
      continue;
    }

    const issue = extractJsonField(clean, "issue");
    if (issue) {
      partialItem.text = issue;
      partialItem.type = partialItem.severity === "high" ? "warning" : "info";
      continue;
    }

    const rewrite = extractJsonField(clean, "rewrite");
    if (rewrite) {
      partialItem.rewrite = rewrite;
      continue;
    }

    const why = extractJsonField(clean, "why");
    if (why) {
      partialItem.why = why;
      if ((partialItem.text || "").trim().length > 3) {
        findings.push({
          type: partialItem.type || "info",
          category: partialItem.category,
          severity: partialItem.severity,
          text: partialItem.text || "",
          rewrite: partialItem.rewrite,
          why: partialItem.why,
        });
        partialItem = {};
      }
      continue;
    }

    const structured = clean.match(/^\[([^\]]+)\]\s*(?:\[([^\]]+)\]\s*)?Issue:\s*(.+?)\s*\|\s*Rewrite:\s*(.+?)\s*\|\s*Why:\s*(.+)$/i);
    if (structured) {
      const sevText = (structured[2] || "medium").toLowerCase();
      const severity: "high" | "medium" | "low" = sevText === "high" || sevText === "low" ? sevText : "medium";
      findings.push({
        type: severity === "high" ? "warning" : "info",
        category: structured[1].trim(),
        severity,
        text: structured[3].trim(),
        rewrite: structured[4].trim(),
        why: structured[5].trim(),
      });
      continue;
    }

    const plainStructured = clean.match(/^([a-z &\/-]+)\s+(high|medium|low)\s+Issue:\s*(.+?)(?:\s*\|\s*Rewrite:\s*(.+?))?(?:\s*\|\s*Why:\s*(.+))?$/i);
    if (plainStructured) {
      const sevText = plainStructured[2].toLowerCase();
      const severity: "high" | "medium" | "low" = sevText === "high" || sevText === "low" ? sevText : "medium";
      findings.push({
        type: severity === "high" ? "warning" : "info",
        category: plainStructured[1].trim(),
        severity,
        text: plainStructured[3].trim(),
        rewrite: plainStructured[4]?.trim(),
        why: plainStructured[5]?.trim(),
      });
      continue;
    }

    const lower = clean.toLowerCase();
    if (lower.includes("no issue") || lower.includes("looks good") || lower.includes("well-written") || lower.includes("no error") || lower.includes("correct") || lower.includes("✅") || lower.includes("great")) {
      findings.push({ type: "success", text: clean });
    } else if (lower.includes("consider") || lower.includes("suggest") || lower.includes("could") || lower.includes("might") || lower.includes("alternatively") || lower.includes("tip")) {
      findings.push({ type: "info", text: clean });
    } else {
      findings.push({ type: "warning", text: clean });
    }
  }

  if ((partialItem.text || "").trim().length > 3) {
    findings.push({
      type: partialItem.type || "info",
      category: partialItem.category,
      severity: partialItem.severity,
      text: partialItem.text || "",
      rewrite: partialItem.rewrite,
      why: partialItem.why,
    });
  }

  if (partialOverall && findings.length > 0) {
    findings.unshift({ type: "success", text: partialOverall });
  }

  if (findings.length > 0) return findings.slice(0, 6);

  const fallback = md.replace(/[#*]/g, "").trim();
  return fallback ? [{ type: "info", text: fallback }] : [];
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
      let accepted = "";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const userPrompt = `Please review this email. Return plain lines only in this exact format:\n[Category] [Severity] Issue: ... | Rewrite: ... | Why: ...\n\nEmail:\n${emailBody}`;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAiHeaders()),
          },
          body: JSON.stringify({
            mode: "grammar-check",
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!resp.ok || !resp.body) { toast.error("Failed to check grammar."); return; }

        const fullText = await readSseText(resp);
        const parsed = parseFindingsFromMarkdown(fullText);
        if (!isCoachGarbageOutput(fullText, parsed) && !isCoachWeakOutput(parsed)) {
          accepted = fullText;
          break;
        }
      }

      if (!accepted.trim()) {
        setResult(buildCoachFallback(emailBody));
        return;
      }

      setResult(accepted);
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

  const severityBadge = {
    high: "bg-rose-500/20 text-rose-200",
    medium: "bg-amber-500/20 text-amber-100",
    low: "bg-emerald-500/20 text-emerald-100",
  } as const;

  const displayFindings = findings.length > 0
    ? findings
    : parseFindingsFromMarkdown(buildCoachFallback(emailBody));

  return (
    <div className="space-y-3 pb-1">
      {displayFindings.slice(0, 6).map((f, i) => (
        <div key={i} className={`flex items-start gap-2.5 rounded-lg border p-3 ${bgMap[f.type]} transition-all hover:shadow-md`}>
          {iconMap[f.type]}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {f.category && <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.category}</div>}
              {f.severity && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${severityBadge[f.severity]}`}>
                  {f.severity}
                </span>
              )}
            </div>
            <div className="text-sm text-foreground/85 leading-relaxed">{f.text}</div>
            {f.rewrite && <div className="text-sm text-emerald-400/90 leading-relaxed">Rewrite: {f.rewrite}</div>}
            {f.why && <div className="text-xs text-muted-foreground leading-relaxed">Why: {f.why}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GrammarCheck;



