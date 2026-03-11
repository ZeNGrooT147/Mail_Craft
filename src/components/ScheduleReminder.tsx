import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Bell, BellRing, Clock, Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";

interface Reminder {
  id: string;
  user_id: string;
  draft_id: string | null;
  remind_at: string;
  title: string;
  is_dismissed: boolean;
  created_at: string;
}

interface ScheduleReminderProps {
  draftId?: string | null;
  draftSubject?: string;
}

const ScheduleReminder = ({ draftId, draftSubject }: ScheduleReminderProps) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("09:00");
  const [titleInput, setTitleInput] = useState("");

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("draft_reminders")
      .select("*")
      .eq("is_dismissed", false)
      .order("remind_at", { ascending: true });
    setReminders((data as Reminder[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  // Play a chime sound using Web Audio API
  const playReminderSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {
      // Audio not available
    }
  }, []);

  // Check for due reminders every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      reminders.forEach((r) => {
        if (!r.is_dismissed && isPast(new Date(r.remind_at))) {
          playReminderSound();
          toast.info(`⏰ Reminder: ${r.title}`, { duration: 10000 });
          supabase.from("draft_reminders").update({ is_dismissed: true }).eq("id", r.id).then(() => {
            setReminders((prev) => prev.filter((x) => x.id !== r.id));
          });
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [reminders, playReminderSound]);

  const createReminder = async () => {
    if (!user || !dateInput) { toast.error("Pick a date."); return; }
    const remindAt = new Date(`${dateInput}T${timeInput}`);
    if (isPast(remindAt)) { toast.error("Pick a future date/time."); return; }

    const { data, error } = await supabase
      .from("draft_reminders")
      .insert({
        user_id: user.id,
        draft_id: draftId || null,
        remind_at: remindAt.toISOString(),
        title: titleInput.trim() || draftSubject || "Send email reminder",
      })
      .select()
      .single();

    if (error) { toast.error("Failed to create reminder."); return; }
    setReminders((prev) => [...prev, data as Reminder].sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()));
    setDateInput("");
    setTitleInput("");
    toast.success("Reminder set!");
  };

  const dismissReminder = async (id: string) => {
    await supabase.from("draft_reminders").update({ is_dismissed: true }).eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reminder dismissed.");
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("draft_reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reminder deleted.");
  };

  if (!user) return null;

  const dueReminders = reminders.filter((r) => isPast(new Date(r.remind_at)));
  const upcoming = reminders.filter((r) => !isPast(new Date(r.remind_at)));

  return (
    <div className="space-y-4">
      {/* Create reminder */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Set a Reminder</span>
        </div>
        <input
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          placeholder={draftSubject ? `Reminder: ${draftSubject}` : "Reminder title…"}
          className="w-full h-10 bg-background rounded-xl px-3 border border-input text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
            className="flex-1 h-10 bg-background rounded-xl px-3 border border-input text-sm outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="w-28 h-10 bg-background rounded-xl px-3 border border-input text-sm outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <Button size="sm" onClick={createReminder} disabled={!dateInput} className="h-9 gap-1.5 text-xs rounded-xl">
          <Bell className="h-3 w-3" />
          Set Reminder
        </Button>
      </div>

      {/* Due now */}
      {dueReminders.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5" /> Due Now
          </span>
          {dueReminders.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4"
            >
              <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <BellRing className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(r.remind_at), "MMM d, h:mm a")}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => dismissReminder(r.id)}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteReminder(r.id)}>
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : upcoming.length === 0 && dueReminders.length === 0 ? (
        <div className="text-center py-10">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">No reminders set</p>
          <p className="text-xs text-muted-foreground mt-1">Set a reminder to follow up on your emails.</p>
        </div>
      ) : upcoming.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Upcoming
          </span>
          {upcoming.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-md transition-all duration-200"
            >
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(r.remind_at), "MMM d, h:mm a")} · {formatDistanceToNow(new Date(r.remind_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                onClick={() => deleteReminder(r.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleReminder;
