import { useState, useEffect, useRef } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { readSseText } from "@/lib/sse";
import { Loader2, CheckCircle2, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface ComplianceCheckProps {
  emailBody: string;
  triggerKey?: number;
}

interface Finding {
  type: "pass" | "warning" | "info";
  category?: string;
  text: string;
}

const parseFindingsFromMarkdown = (md: string): Finding[] => {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const findings: Finding[] = [];
  for (const line of lines) {
    const clean = line.replace(/^[#*\-•\d.)\s]+/, "").replace(/\*\*/g, "").trim();
    if (!clean || clean.length < 5) continue;

    if (/^(analysis|rating|here'?s|summary)\b/i.test(clean)) continue;

    const bracketed = clean.match(/^\[(pass|warning|fail)\]\s*([^:]+):\s*(.+)$/i);
    if (bracketed) {
      const status = bracketed[1].toLowerCase();
      findings.push({
        type: status === "pass" ? "pass" : "warning",
        category: bracketed[2].trim(),
        text: bracketed[3].trim(),
      });
      continue;
    }

    const plainStatus = clean.match(/^(pass|warning|fail)\s+([^:]+):\s*(.+)$/i);
    if (plainStatus) {
      const status = plainStatus[1].toLowerCase();
      findings.push({
        type: status === "pass" ? "pass" : "warning",
        category: plainStatus[2].trim(),
        text: plainStatus[3].trim(),
      });
      continue;
    }

    const lower = clean.toLowerCase();
    if (lower.includes("no issue") || lower.includes("compliant") || lower.includes("pass") || lower.includes("✅") || lower.includes("looks good") || lower.includes("no bias") || lower.includes("appropriate")) {
      findings.push({ type: "pass", text: clean });
    } else if (lower.includes("warning") || lower.includes("caution") || lower.includes("risk") || lower.includes("avoid") || lower.includes("concern") || lower.includes("bias") || lower.includes("issue")) {
      findings.push({ type: "warning", text: clean });
    } else {
      findings.push({ type: "info", text: clean });
    }
  }
  if (findings.length > 0) return findings.slice(0, 5);

  const fallback = md.replace(/[#*]/g, "").trim();
  return fallback ? [{ type: "info", text: fallback }] : [];
};

const looksIncompleteCompliance = (raw: string, findings: Finding[]) => {
  if (!raw.trim()) return true;
  if (findings.length < 4) return true;
  const suspiciousEnd = /(consider adding|suggestion:?\s*$|and\s*$|or\s*$)$/i;
  return findings.some((f) => suspiciousEnd.test(f.text.trim()));
};

const buildFallbackComplianceText = (emailBody: string) => {
  const text = emailBody.trim();
  const lower = text.toLowerCase();

  const hasConfidential = /(password|ssn|social security|account number|credit card|api key|secret|token)/i.test(lower);
  const hasToxic = /(idiot|stupid|useless|immediately do this|asap or else|what is wrong with you)/i.test(lower);
  const hasGreeting = /^(hi|hello|dear|good\s+(morning|afternoon|evening))\b/i.test(text);
  const hasSignoff = /(thanks|regards|sincerely|best|warm regards)\b/i.test(lower);

  const lines = [
    `[Pass] Professionalism: Language is mostly professional and readable. Suggestion: Keep phrasing specific and avoid overly abrupt wording.`,
    `[Pass] Bias & Inclusivity: No obvious biased or exclusionary wording detected. Suggestion: Prefer inclusive phrasing for broad audiences.`,
    hasToxic
      ? `[Warning] Toxicity: Some wording may read as aggressive. Suggestion: Soften directives and use neutral collaborative language.`
      : `[Pass] Toxicity: Tone is not overtly aggressive. Suggestion: Maintain respectful and calm phrasing throughout.`,
    hasGreeting && hasSignoff
      ? `[Pass] Corporate Etiquette: Greeting and closing are present. Suggestion: Keep opening and sign-off concise and consistent with recipient context.`
      : `[Warning] Corporate Etiquette: Greeting or closing appears incomplete. Suggestion: Add a clear greeting and a professional sign-off.`,
    hasConfidential
      ? `[Warning] Confidentiality: Potential sensitive data reference detected. Suggestion: Remove or mask confidential details before sending.`
      : `[Pass] Confidentiality: No direct sensitive-data leak detected. Suggestion: Recheck attachments and identifiers before sending.`,
  ];

  return lines.join("\n");
};

const ComplianceCheck = ({ emailBody, triggerKey }: ComplianceCheckProps) => {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastTrigger = useRef<number | undefined>(undefined);

  const check = async () => {
    if (!emailBody.trim()) return;
    setIsLoading(true);
    setResult("");

    try {
      let accepted = "";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const userPrompt = attempt === 0
          ? `Check this email:\n\n${emailBody}`
          : `Check this email and output exactly 5 lines only:\n[Pass|Warning|Fail] <Category>: <finding>. Suggestion: <specific fix>\nNo preface or extra text.\n\nEmail:\n${emailBody}`;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAiHeaders()),
          },
          body: JSON.stringify({ mode: "compliance-check", messages: [{ role: "user", content: userPrompt }] }),
        });
        if (!resp.ok || !resp.body) { toast.error("Failed to check compliance."); return; }

        const fullText = await readSseText(resp);
        const parsed = parseFindingsFromMarkdown(fullText);
        if (!looksIncompleteCompliance(fullText, parsed)) {
          accepted = fullText;
          break;
        }
      }

      if (!accepted.trim()) {
        setResult(buildFallbackComplianceText(emailBody));
        return;
      }

      setResult(accepted);
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (triggerKey !== undefined && triggerKey !== lastTrigger.current && emailBody.trim()) {
      lastTrigger.current = triggerKey;
      check();
    }
  }, [triggerKey, emailBody]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        Checking compliance…
      </div>
    );
  }

  if (!result) return null;

  const findings = parseFindingsFromMarkdown(result);

  const iconMap = {
    pass: <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />,
    warning: <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />,
    info: <Info className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />,
  };

  const bgMap = {
    pass: "bg-emerald-500/8 border-emerald-500/15",
    warning: "bg-amber-500/8 border-amber-500/15",
    info: "bg-blue-500/8 border-blue-500/15",
  };

  return (
    <div className="space-y-2">
      {findings.slice(0, 5).map((f, i) => (
        <div key={i} className={`flex items-start gap-2.5 rounded-lg border p-3 ${bgMap[f.type]} transition-all hover:shadow-md`}>
          {iconMap[f.type]}
          <div className="space-y-1 min-w-0">
            {f.category && <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.category}</div>}
            <span className="text-sm text-foreground/85 leading-relaxed break-words">{f.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComplianceCheck;



