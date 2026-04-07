import { useState, useEffect, useRef } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { readSseText } from "@/lib/sse";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface SubjectLineSuggestionsProps {
  emailBody: string;
  context: string;
  currentSubject?: string;
  onSelectSubject: (subject: string) => void;
  triggerKey?: number;
}

const parseSubjectLines = (raw: string) => {
  return raw
    .split("\n")
    .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((l) => l.length > 6)
    .filter((l) => !/\[[^\]]+\]/.test(l))
    .filter((l) => !/^subject\s*:/i.test(l))
    .filter((l) => !/^here\s+(are|is)\b/i.test(l))
    .filter((l) => !/^for\s+your\b/i.test(l));
};

const looksWeakSubjects = (raw: string, lines: string[]) => {
  if (!raw.trim()) return true;
  if (lines.length < 3) return true;
  if (/^here\s+(are|is)\s+\d+\s+subject\s+line/i.test(raw.trim())) return true;
  return lines.every((l) => l.length < 12 || /subject line/i.test(l));
};

const buildFallbackSubjects = (content: string, currentSubject?: string) => {
  const source = (currentSubject || content || "").replace(/\s+/g, " ").trim();
  const words = source.split(" ").filter(Boolean);
  const topic = words.slice(0, 6).join(" ") || "Project update";
  const trimmedTopic = topic.length > 45 ? `${topic.slice(0, 45).trim()}...` : topic;
  return [
    `${trimmedTopic}: next steps`,
    `Update: ${trimmedTopic}`,
    `${trimmedTopic} - action required`,
    `Quick alignment on ${words.slice(0, 3).join(" ") || "current plan"}`,
    `Follow-up: ${trimmedTopic}`,
  ];
};

const SubjectLineSuggestions = ({ emailBody, context, currentSubject, onSelectSubject, triggerKey }: SubjectLineSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastTrigger = useRef<number | undefined>(undefined);

  const generateSubjects = async () => {
    const content = emailBody || context;
    if (!content.trim()) return;
    setIsLoading(true);
    setSuggestions([]);

    try {
      let accepted: string[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const prompt = attempt === 0
          ? `Generate subject lines for this email content:\n\n${content}\n\nExisting subject (if any): ${currentSubject || "none"}\n\nRequirements:\n- Do not use placeholders like [Name], [Your Name], [Company], [Date].\n- Keep subjects practical and human.`
          : `Generate exactly 5 subject lines only. Output strictly as:\n1. ...\n2. ...\n3. ...\n4. ...\n5. ...\nNo intro text, no explanation.\n\nEmail:\n${content}`;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAiHeaders()),
          },
          body: JSON.stringify({
            mode: "subject-lines",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!resp.ok || !resp.body) { toast.error("Failed to generate."); return; }

        const fullText = await readSseText(resp);
        const lines = parseSubjectLines(fullText);
        const unique = Array.from(new Set(lines));
        if (!looksWeakSubjects(fullText, unique)) {
          accepted = unique.slice(0, 5);
          break;
        }
      }

      if (accepted.length === 0) {
        accepted = buildFallbackSubjects(content, currentSubject).slice(0, 5);
      }

      setSuggestions(accepted);
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



