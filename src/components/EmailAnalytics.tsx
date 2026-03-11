import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Loader2, TrendingUp, FileText, Send, RefreshCw,
  Type, Gauge, Calendar as CalendarIcon, Download, FileDown,
} from "lucide-react";
import { format, subDays, startOfDay, eachWeekOfInterval, subWeeks, isAfter, isBefore, startOfWeek } from "date-fns";
import ProductivityStreaks from "@/components/ProductivityStreaks";
import PeakHoursHeatmap from "@/components/PeakHoursHeatmap";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface EventRow {
  event_type: string;
  created_at: string;
}

interface DraftRow {
  draft_body: string;
  tone: string | null;
  created_at: string;
}

const COLORS = [
  "hsl(14, 80%, 56%)",
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(47, 96%, 53%)",
  "hsl(0, 72%, 51%)",
];

const eventLabels: Record<string, string> = {
  draft_created: "Drafts Created",
  draft_refined: "Refinements",
  sent_gmail: "Sent via Gmail",
  sent_outlook: "Sent via Outlook",
  draft_deleted: "Deleted",
};

const EmailAnalytics = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const presets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [eventsRes, draftsRes] = await Promise.all([
        supabase.from("email_events").select("event_type, created_at").order("created_at", { ascending: true }),
        supabase.from("email_drafts").select("draft_body, tone, created_at").order("created_at", { ascending: true }),
      ]);
      setEvents((eventsRes.data as EventRow[]) || []);
      setDrafts((draftsRes.data as DraftRow[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Filter data by date range
  const filteredEvents = useMemo(() => {
    if (!dateRange?.from) return events;
    return events.filter((e) => {
      const d = new Date(e.created_at);
      if (dateRange.from && isBefore(d, startOfDay(dateRange.from))) return false;
      if (dateRange.to && isAfter(d, new Date(startOfDay(dateRange.to).getTime() + 86400000 - 1))) return false;
      return true;
    });
  }, [events, dateRange]);

  const filteredDrafts = useMemo(() => {
    if (!dateRange?.from) return drafts;
    return drafts.filter((d) => {
      const dt = new Date(d.created_at);
      if (dateRange.from && isBefore(dt, startOfDay(dateRange.from))) return false;
      if (dateRange.to && isAfter(dt, new Date(startOfDay(dateRange.to).getTime() + 86400000 - 1))) return false;
      return true;
    });
  }, [drafts, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading analytics…
      </div>
    );
  }

  // --- Event aggregation (use filtered data) ---
  const typeCounts: Record<string, number> = {};
  filteredEvents.forEach((e) => {
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
  });

  const pieData = Object.entries(typeCounts).map(([name, value]) => ({
    name: eventLabels[name] || name,
    value,
  }));

  const totalDrafts = typeCounts["draft_created"] || 0;
  const totalRefined = typeCounts["draft_refined"] || 0;
  const totalSent = (typeCounts["sent_gmail"] || 0) + (typeCounts["sent_outlook"] || 0);

  // --- Draft-based metrics ---
  const avgDraftLength = filteredDrafts.length > 0
    ? Math.round(filteredDrafts.reduce((sum, d) => sum + d.draft_body.length, 0) / filteredDrafts.length)
    : 0;

  const avgWordCount = filteredDrafts.length > 0
    ? Math.round(filteredDrafts.reduce((sum, d) => sum + d.draft_body.split(/\s+/).filter(Boolean).length, 0) / filteredDrafts.length)
    : 0;

  // Most used tone
  const toneCounts: Record<string, number> = {};
  filteredDrafts.forEach((d) => {
    const t = d.tone || "Unknown";
    toneCounts[t] = (toneCounts[t] || 0) + 1;
  });
  const toneEntries = Object.entries(toneCounts).sort((a, b) => b[1] - a[1]);
  const topTone = toneEntries[0]?.[0] || "—";
  const toneBarData = toneEntries.map(([name, count]) => ({ name, count }));

  // --- Last 7 days bar chart ---
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 6 - i));
    const label = format(day, "EEE");
    const count = filteredEvents.filter((e) => {
      const d = startOfDay(new Date(e.created_at));
      return d.getTime() === day.getTime();
    }).length;
    return { day: label, count };
  });

  // --- Weekly trends (last 8 weeks) ---
  const now = new Date();
  const eightWeeksAgo = subWeeks(now, 7);
  const weeks = eachWeekOfInterval({ start: eightWeeksAgo, end: now }, { weekStartsOn: 1 });
  const weeklyData = weeks.map((ws) => {
    const we = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000);
    const label = format(ws, "MMM d");
    const created = filteredEvents.filter((e) => {
      const d = new Date(e.created_at);
      return d >= ws && d < we && e.event_type === "draft_created";
    }).length;
    const sent = filteredEvents.filter((e) => {
      const d = new Date(e.created_at);
      return d >= ws && d < we && (e.event_type === "sent_gmail" || e.event_type === "sent_outlook");
    }).length;
    return { week: label, created, sent };
  });

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  const hasData = filteredEvents.length > 0 || filteredDrafts.length > 0;

  const exportCSV = () => {
    const rangeLabel = dateRange?.from
      ? `${format(dateRange.from, "yyyy-MM-dd")}${dateRange.to ? ` to ${format(dateRange.to, "yyyy-MM-dd")}` : ""}`
      : "All time";

    const rows = [
      ["MailCraft Analytics Report"],
      [`Date Range: ${rangeLabel}`],
      [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`],
      [],
      ["Metric", "Value"],
      ["Drafts Created", String(totalDrafts)],
      ["Refinements", String(totalRefined)],
      ["Emails Sent", String(totalSent)],
      ["Avg. Words/Draft", String(avgWordCount)],
      ["Avg. Chars/Draft", String(avgDraftLength)],
      ["Most Used Tone", topTone],
      [],
      ["Tone Distribution"],
      ["Tone", "Count"],
      ...toneBarData.map((t) => [t.name, String(t.count)]),
      [],
      ["Daily Activity (Last 7 Days)"],
      ["Day", "Events"],
      ...last7.map((d) => [d.day, String(d.count)]),
      [],
      ["Weekly Trends"],
      ["Week", "Drafts Created", "Emails Sent"],
      ...weeklyData.map((w) => [w.week, String(w.created), String(w.sent)]),
      [],
      ["Event Log"],
      ["Event Type", "Timestamp"],
      ...filteredEvents.map((e) => [eventLabels[e.event_type] || e.event_type, e.created_at]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mailcraft-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Use print-to-PDF with a styled printable view
    const rangeLabel = dateRange?.from
      ? `${format(dateRange.from, "MMM d, yyyy")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d, yyyy")}` : ""}`
      : "All time";

    const html = `
      <!DOCTYPE html>
      <html><head><title>MailCraft Analytics</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; text-align: center; }
        .card .value { font-size: 28px; font-weight: 700; }
        .card .label { font-size: 11px; color: #888; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px; }
        th { font-weight: 600; background: #f9f9f9; }
        h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <h1>📊 MailCraft Analytics Report</h1>
        <div class="subtitle">${rangeLabel} · Generated ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}</div>
        <div class="grid">
          <div class="card"><div class="value">${totalDrafts}</div><div class="label">Drafts Created</div></div>
          <div class="card"><div class="value">${totalRefined}</div><div class="label">Refinements</div></div>
          <div class="card"><div class="value">${totalSent}</div><div class="label">Emails Sent</div></div>
          <div class="card"><div class="value">${avgWordCount}</div><div class="label">Avg. Words/Draft</div></div>
          <div class="card"><div class="value">${topTone}</div><div class="label">Most Used Tone</div></div>
          <div class="card"><div class="value">${avgDraftLength}</div><div class="label">Avg. Chars/Draft</div></div>
        </div>
        ${toneBarData.length > 0 ? `
          <h2>Tone Distribution</h2>
          <table><tr><th>Tone</th><th>Count</th></tr>
            ${toneBarData.map((t) => `<tr><td>${t.name}</td><td>${t.count}</td></tr>`).join("")}
          </table>
        ` : ""}
        <h2>Weekly Trends</h2>
        <table><tr><th>Week</th><th>Drafts</th><th>Sent</th></tr>
          ${weeklyData.map((w) => `<tr><td>${w.week}</td><td>${w.created}</td><td>${w.sent}</td></tr>`).join("")}
        </table>
      </body></html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter + Export */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), p.days), to: new Date() })}
              className={cn(
                "h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs rounded-lg",
                dateRange?.from && Math.abs(subDays(new Date(), p.days).getTime() - dateRange.from.getTime()) < 86400000
                  ? "bg-primary text-primary-foreground border-primary"
                  : ""
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs rounded-lg gap-1.5", dateRange?.from && "border-primary/50")}>
                <CalendarIcon className="h-3 w-3" />
                {dateRange?.from ? (
                  dateRange.to ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}` : format(dateRange.from, "MMM d")
                ) : "Custom range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {dateRange?.from && (
            <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="h-7 sm:h-8 px-2 text-[11px] sm:text-xs text-muted-foreground">
              Clear
            </Button>
          )}

          {/* Export buttons */}
          <div className="flex gap-1 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs rounded-lg gap-1">
              <Download className="h-3 w-3" />
              <span className="hidden xs:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs rounded-lg gap-1">
              <FileDown className="h-3 w-3" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats cards — row 1 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Drafts Created", value: totalDrafts, icon: FileText, color: "text-primary" },
          { label: "Refinements", value: totalRefined, icon: RefreshCw, color: "text-info" },
          { label: "Emails Sent", value: totalSent, icon: Send, color: "text-success" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{stat.value}</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Stats cards — row 2: new metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
            <Type className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{avgWordCount}</div>
          <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Avg. Words</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
            <Gauge className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-sm sm:text-lg font-display font-bold text-foreground truncate">{topTone}</div>
          <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Top Tone</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-rose-500/10 flex items-center justify-center mx-auto mb-2">
            <CalendarIcon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{avgDraftLength}</div>
          <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Avg. Chars</div>
        </div>
      </div>

      {/* Productivity Streaks */}
      <ProductivityStreaks eventDates={filteredEvents.map((e) => e.created_at)} />

      {!hasData ? (
        <div className="text-center py-10">
          <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start composing emails to see your analytics here.</p>
        </div>
      ) : (
        <>
          {/* Peak Hours Heatmap */}
          <PeakHoursHeatmap eventDates={filteredEvents.map((e) => e.created_at)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last 7 days */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Last 7 Days Activity</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={last7}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={24} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activity breakdown pie */}
            {pieData.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Activity Breakdown</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weekly trends line chart */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Weekly Trends (8 weeks)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={24} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Drafts" />
                  <Line type="monotone" dataKey="sent" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Sent" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary" /> Drafts Created
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} /> Emails Sent
                </div>
              </div>
            </div>

            {/* Tone distribution bar chart */}
            {toneBarData.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Tone Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={toneBarData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {toneBarData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmailAnalytics;
