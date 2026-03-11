import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import type { Tables } from "@/integrations/supabase/types";
import {
  FileText, PenLine, Send, Flame, TrendingUp,
  Clock, Sparkles, ArrowRight, Loader2, Mail,
  BarChart3, MessageSquare, BookOpen,
} from "lucide-react";
import { startOfDay, subDays, differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";

interface DashboardInsightsProps {
  onLoadDraft?: (draft: Tables<"email_drafts">) => void;
  onSwitchTab?: (tab: string) => void;
}

const DashboardInsights = ({ onLoadDraft, onSwitchTab }: DashboardInsightsProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [recentDrafts, setRecentDrafts] = useState<Tables<"email_drafts">[]>([]);
  const [totalDrafts, setTotalDrafts] = useState(0);
  const [totalSignatures, setTotalSignatures] = useState(0);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const today = startOfDay(new Date()).toISOString();
      const [draftsRes, sigsRes, recentRes, eventsRes, todayEventsRes] = await Promise.all([
        supabase.from("email_drafts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("email_signatures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("email_drafts").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("email_events").select("created_at").eq("user_id", user.id),
        supabase.from("email_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", today),
      ]);
      setTotalDrafts(draftsRes.count ?? 0);
      setTotalSignatures(sigsRes.count ?? 0);
      setRecentDrafts(recentRes.data ?? []);
      setEventDates((eventsRes.data ?? []).map((e) => e.created_at));
      setTodayCount(todayEventsRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [user]);

  const { currentStreak, longestStreak } = useMemo(() => {
    if (eventDates.length === 0) return { currentStreak: 0, longestStreak: 0 };
    const uniqueDays = new Set(eventDates.map((d) => startOfDay(new Date(d)).toISOString()));
    const sorted = Array.from(uniqueDays).map((d) => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
    let current = 0;
    const now = startOfDay(new Date());
    for (let i = 0; i < sorted.length; i++) {
      const expected = startOfDay(subDays(now, i));
      if (differenceInCalendarDays(sorted[i], expected) === 0) current++;
      else if (i === 0 && differenceInCalendarDays(expected, sorted[0]) === 1) continue;
      else break;
    }
    let longest = 1, streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (differenceInCalendarDays(sorted[i - 1], sorted[i]) === 1) { streak++; longest = Math.max(longest, streak); }
      else streak = 1;
    }
    return { currentStreak: current, longestStreak: Math.max(longest, current) };
  }, [eventDates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const displayName = profile?.display_name?.split(" ")[0] || "";

  const stats = [
    { label: "Total Drafts", value: totalDrafts, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Today's Activity", value: todayCount, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { label: "Current Streak", value: `${currentStreak}d`, icon: Flame, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Signatures", value: totalSignatures, icon: PenLine, color: "text-info", bg: "bg-info/10" },
  ];

  const quickActions = [
    { label: "New Email", description: "AI-powered drafting", icon: Sparkles, tab: "compose" },
    { label: "Templates", description: "Pre-built starters", icon: BookOpen, tab: "templates" },
    { label: "Analytics", description: "Track productivity", icon: BarChart3, tab: "analytics" },
    { label: "Threads", description: "Email conversations", icon: MessageSquare, tab: "threads" },
  ];

  const formatDate = (d: string) => {
    const date = new Date(d);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Greeting Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -2 }}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/90 p-6 sm:p-8 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.45)]"
      >
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            {greeting}{displayName ? `, ${displayName}` : ""} 👋
          </h2>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-xl">Here is your workspace snapshot — drafts, activity, and shortcuts to keep momentum high.</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 hover:border-primary/25 hover:shadow-md transition-all duration-300 group"
            >
              <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-4xl sm:text-[2.25rem] font-display font-bold text-foreground tracking-tight">{s.value}</p>
              <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Today’s Focus</p>
              <p className="text-sm text-muted-foreground">{todayCount > 0 ? `You logged ${todayCount} activity events today.` : "No activity yet today — start with a quick draft."}</p>
            </div>
          </div>
          <button
            onClick={() => onSwitchTab?.("compose")}
            className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Open compose <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base font-display font-bold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSwitchTab?.(a.tab)}
                className="rounded-2xl border border-border/80 bg-card/90 group flex flex-col items-start gap-3 p-4 text-left hover:border-primary/20 hover:shadow-md transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                  <Icon className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                    <p className="text-base font-bold text-foreground">{a.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent Drafts */}
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5 shadow-[0_16px_30px_-26px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-display font-bold text-foreground">Recent Drafts</h3>
          <button onClick={() => onSwitchTab?.("drafts")} className="text-sm text-primary font-bold flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentDrafts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background/60 p-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-5 w-5 text-primary/40" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No drafts yet</p>
            <p className="text-xs text-muted-foreground">Start composing your first email!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDrafts.map((draft, i) => (
              <motion.button
                key={draft.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 2 }}
                onClick={() => onLoadDraft?.(draft)}
                className="w-full text-left rounded-2xl border border-border bg-background/70 p-4 flex items-center gap-3 group hover:border-primary/20 hover:shadow-md transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {draft.subject || "Untitled Draft"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {draft.recipient || "No recipient"} · {formatDate(draft.updated_at)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Streak Insight */}
      {currentStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-primary/20 bg-card/90 p-5 flex items-center gap-4 shadow-[0_16px_35px_-24px_rgba(0,0,0,0.4)]"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-display font-bold text-foreground">
              {currentStreak} day streak! 🔥
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentStreak >= longestStreak ? "You're at your longest streak!" : `Best: ${longestStreak} days. Keep going!`}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardInsights;
