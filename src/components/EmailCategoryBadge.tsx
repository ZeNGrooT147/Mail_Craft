import { useState, useEffect } from "react";
import { getAiHeaders } from "@/lib/aiHeaders";
import { readSseText } from "@/lib/sse";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, CheckCircle2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

const categoryConfig: Record<string, { icon: React.ElementType; className: string }> = {
  urgent: { icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/30" },
  "action-required": { icon: CheckCircle2, className: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  fyi: { icon: Info, className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  social: { icon: Users, className: "bg-green-500/10 text-green-600 border-green-500/30" },
  newsletter: { icon: Info, className: "bg-muted text-muted-foreground border-border" },
  spam: { icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

interface EmailCategoryBadgeProps {
  emailText: string;
}

const EmailCategoryBadge = ({ emailText }: EmailCategoryBadgeProps) => {
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!emailText.trim() || emailText.length < 20) { setCategory(""); setPriority(""); return; }

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          ...(await getAiHeaders()),
        },
          body: JSON.stringify({ mode: "categorize", messages: [{ role: "user", content: emailText }] }),
        });
        if (!resp.ok || !resp.body) return;

        const fullText = await readSseText(resp);

        const lines = fullText.trim().split("\n").map(l => l.trim().toLowerCase());
        if (lines[0]) setCategory(lines[0]);
        if (lines[1]) setPriority(lines[1]);
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    }, 800);

    return () => clearTimeout(timeout);
  }, [emailText]);

  if (isLoading) return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (!category) return null;

  const config = categoryConfig[category] || categoryConfig.fyi;
  const Icon = config.icon;

  return (
    <div className="flex gap-1.5 items-center">
      <Badge variant="outline" className={`text-[10px] gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {category}
      </Badge>
      {priority && (
        <Badge variant="outline" className={`text-[10px] ${priorityColors[priority] || priorityColors.medium}`}>
          {priority} priority
        </Badge>
      )}
    </div>
  );
};

export default EmailCategoryBadge;



