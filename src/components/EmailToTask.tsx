import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListChecks, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

interface EmailToTaskProps {
  emailText: string;
}

const EmailToTask = ({ emailText }: EmailToTaskProps) => {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const extract = async () => {
    if (!emailText.trim()) return;
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
        body: JSON.stringify({ mode: "email-to-task", messages: [{ role: "user", content: emailText }] }),
      });
      if (!resp.ok || !resp.body) { toast.error("Failed to extract tasks."); setIsLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "", fullText = "";
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
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) { fullText += c; setResult(fullText); } }
          catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  const copyTasks = () => {
    navigator.clipboard.writeText(result);
    toast.success("Tasks copied!");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Extract Tasks</span>
        <div className="flex gap-1">
          {result && (
            <Button variant="ghost" size="sm" onClick={copyTasks} className="h-7 px-2 text-xs gap-1">
              <Copy className="h-3 w-3" /> Copy
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={extract} disabled={isLoading || !emailText.trim()} className="h-7 px-3 text-xs gap-1.5">
            {isLoading ? <><Loader2 className="h-3 w-3 animate-spin" />Extracting…</> : <><ListChecks className="h-3 w-3" />Extract</>}
          </Button>
        </div>
      </div>
      {(result || isLoading) && (
        <div className="rounded-lg bg-secondary/50 border border-border p-3">
          {result ? (
            <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed text-xs"><ReactMarkdown>{result}</ReactMarkdown></div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="h-3 w-3 animate-spin" />Extracting tasks…</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailToTask;
