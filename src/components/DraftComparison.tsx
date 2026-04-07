import { useState } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { readSseText } from "@/lib/sse";
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
  const [changes, setChanges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const parseAbResponse = (text: string) => {
    const variantMatch = text.match(/\[VARIANT\]([\s\S]*?)\[\/VARIANT\]/i);
    const changesMatch = text.match(/\[CHANGES\]([\s\S]*?)\[\/CHANGES\]/i);

    const parsedVariant = variantMatch?.[1]?.trim() || text.trim();
    const parsedChanges = (changesMatch?.[1] || "")
      .split("\n")
      .map((line) => line.replace(/^[\-*•\d.)\s]+/, "").trim())
      .filter((line) => line.length > 8)
      .slice(0, 4);

    return { parsedVariant, parsedChanges };
  };

  const looksWeakAbOutput = (variant: string, changesList: string[]) => {
    if (!variant.trim()) return true;
    if (variant.trim().length < 80) return true;
    if (changesList.length < 2) return true;
    return false;
  };

  const buildFallbackAb = (base: string) => {
    const normalized = base.replace(/\s+/g, " ").trim();
    const compact = normalized.length > 600 ? `${normalized.slice(0, 600).trim()}...` : normalized;
    const fallbackVariant = `Hi [Name],\n\nQuick update: ${compact}\n\nTo keep momentum, I suggest we align on the immediate next step and confirm ownership so execution stays on track.\n\nIf this direction works for you, I can finalize the updated version right away.\n\nBest regards,\n[Your Name]`;
    const fallbackChanges = [
      "Reframed the opening to state purpose immediately.",
      "Improved structure with clear progression from update to next step.",
      "Strengthened close with a specific, professional call to action.",
    ];
    return { fallbackVariant, fallbackChanges };
  };

  const generateAlt = async () => {
    if (!currentDraft.trim()) { toast.error("Generate a draft first."); return; }
    setIsLoading(true);
    setAltDraft("");
    setChanges([]);

    try {
      let acceptedVariant = "";
      let acceptedChanges: string[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const userPrompt = attempt === 0
          ? `Here is the current email draft:\n\n${currentDraft}`
          : `Create a complete alternative email with a clearly different structure and wording. Output exactly:\n[VARIANT]\n<full email>\n[/VARIANT]\n[CHANGES]\n- ...\n- ...\n- ...\n[/CHANGES]\n\nDraft:\n${currentDraft}`;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAiHeaders()),
          },
          body: JSON.stringify({
            mode: "ab-draft",
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!resp.ok || !resp.body) { toast.error("Failed to generate variation."); return; }

        const fullText = await readSseText(resp, (_, partial) => {
          const { parsedVariant, parsedChanges } = parseAbResponse(partial);
          setAltDraft(parsedVariant);
          setChanges(parsedChanges);
        });

        const { parsedVariant, parsedChanges } = parseAbResponse(fullText);
        if (!looksWeakAbOutput(parsedVariant, parsedChanges)) {
          acceptedVariant = parsedVariant;
          acceptedChanges = parsedChanges;
          break;
        }
      }

      if (!acceptedVariant.trim()) {
        const fb = buildFallbackAb(currentDraft);
        acceptedVariant = fb.fallbackVariant;
        acceptedChanges = fb.fallbackChanges;
      }

      setAltDraft(acceptedVariant);
      setChanges(acceptedChanges);
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
      {changes.length > 0 && (
        <div className="rounded-lg border border-border p-3 bg-background/40">
          <div className="text-xs font-semibold text-muted-foreground mb-2">What changed in Version B</div>
          <ul className="space-y-1.5">
            {changes.map((item, idx) => (
              <li key={idx} className="text-sm text-foreground/85 leading-relaxed">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Version A</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary" onClick={() => { toast.success("Kept Version A"); setAltDraft(""); }}>
              <Check className="h-3 w-3" /> Keep
            </Button>
          </div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{currentDraft}</p>
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
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{altDraft}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftComparison;



