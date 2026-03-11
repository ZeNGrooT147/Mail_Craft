import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Trash2, Loader2, FileText, Clock, ArrowRight, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Draft = Tables<"email_drafts">;

interface SavedDraftsProps {
  onLoadDraft: (draft: Draft) => void;
}

const SavedDrafts = ({ onLoadDraft }: SavedDraftsProps) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("email_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) console.error(error);
    else setDrafts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrafts();
  }, [user]);

  const deleteDraft = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("email_drafts").delete().eq("id", id);
    if (error) toast.error("Failed to delete draft.");
    else {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Draft deleted.");
    }
    setDeletingId(null);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/70 p-10 flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-base text-muted-foreground">Loading drafts…</span>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card/85 p-12 text-center shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)]">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-primary/15">
          <Mail className="h-6 w-6 text-primary/40" />
        </div>
        <p className="text-lg font-display font-bold text-foreground mb-1">No saved drafts yet</p>
        <p className="text-base text-muted-foreground">Create your first draft from Compose and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft, i) => (
        <motion.button
          key={draft.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.995 }}
          onClick={() => onLoadDraft(draft)}
          className="w-full text-left rounded-2xl border border-border/80 bg-card/90 p-4 flex items-center gap-3 group hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        >
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors ring-1 ring-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-foreground truncate">
                {draft.subject || "Untitled Draft"}
              </p>
              {draft.tone && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold shrink-0 border border-border/60">
                  {draft.tone}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {draft.recipient || "No recipient"} · {draft.draft_body.slice(0, 60)}…
            </p>
            <div className="flex items-center gap-1 mt-1.5 text-muted-foreground/55">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteDraft(draft.id);
              }}
            >
              {deletingId === draft.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default SavedDrafts;
