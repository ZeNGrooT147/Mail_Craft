import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { FileText, PenLine, CalendarClock, Sparkles } from "lucide-react";

interface Stats {
  totalDrafts: number;
  totalSignatures: number;
  lastDraftDate: string | null;
  recentDrafts: Tables<"email_drafts">[];
}

interface WorkspaceStatsProps {
  onLoadDraft?: (draft: Tables<"email_drafts">) => void;
}

const WorkspaceStats = ({ onLoadDraft }: WorkspaceStatsProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [draftsRes, sigsRes, recentRes] = await Promise.all([
        supabase.from("email_drafts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("email_signatures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("email_drafts").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(3),
      ]);
      setStats({
        totalDrafts: draftsRes.count ?? 0,
        totalSignatures: sigsRes.count ?? 0,
        lastDraftDate: recentRes.data?.[0]?.updated_at ?? null,
        recentDrafts: (recentRes.data ?? []) as Tables<"email_drafts">[],
      });
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  if (!user || loading) return null;
  if (!stats || (stats.totalDrafts === 0 && stats.totalSignatures === 0)) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center space-y-2">
        <Sparkles className="h-5 w-5 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">No drafts yet — compose your first email below!</p>
      </div>
    );
  }

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Drafts</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stats.totalDrafts}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <PenLine className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Signatures</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stats.totalSignatures}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Last Draft</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {stats.lastDraftDate ? formatRelative(stats.lastDraftDate) : "—"}
          </p>
        </div>
      </div>

      {/* Recent drafts */}
      {stats.recentDrafts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recent Drafts</p>
          <div className="space-y-2">
            {stats.recentDrafts.map((d) => (
              <button
                key={d.id}
                onClick={() => onLoadDraft?.(d)}
                className="flex items-center justify-between gap-4 w-full text-left rounded-lg px-2.5 py-1.5 -mx-2.5 hover:bg-secondary/60 transition-colors group"
              >
                <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{d.subject || "Untitled draft"}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatRelative(d.updated_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceStats;
