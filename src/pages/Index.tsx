import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EmailComposer from "@/components/EmailComposer";
import SavedDrafts from "@/components/SavedDrafts";
import SignatureBuilder from "@/components/SignatureBuilder";
import CommandPalette from "@/components/CommandPalette";
import LandingHero from "@/components/LandingHero";
import EmailAnalytics from "@/components/EmailAnalytics";
import EmailThreadBuilder from "@/components/EmailThreadBuilder";
import ScheduleReminder from "@/components/ScheduleReminder";
import OnboardingTour from "@/components/OnboardingTour";
import TemplatesGallery from "@/components/TemplatesGallery";
import DashboardInsights from "@/components/DashboardInsights";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";
import {
  Mail, LogOut, FileText, PenLine, Sparkles, Search,
  BarChart3, MessageSquare, Bell, LayoutDashboard, BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

const Index = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [draftToLoad, setDraftToLoad] = useState<Tables<"email_drafts"> | null>(null);
  const [draftsKey, setDraftsKey] = useState(0);
  const [activeSignature, setActiveSignature] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"dashboard" | "compose" | "drafts" | "templates" | "signatures" | "analytics" | "threads" | "reminders">("dashboard");
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);
    const providerError = searchParams.get("error") || hashParams.get("error");

    if (!providerError) return;

    const errorDescription =
      searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      "Login was cancelled or denied. Please try again.";

    toast.error(errorDescription.replace(/\+/g, " "));
    navigate("/auth", { replace: true });
  }, [navigate]);

  const handleDraftSaved = useCallback(() => { setDraftsKey((k) => k + 1); }, []);
  const handleLoadDraft = useCallback((draft: Tables<"email_drafts">) => {
    setDraftToLoad(draft);
    setActivePanel("compose");
  }, []);
  const handleDraftLoaded = useCallback(() => { setDraftToLoad(null); }, []);

  const initials = (profile?.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  /* ── Visitor landing ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground tracking-tight">MailCraft</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className="h-9 px-5 text-xs gap-1.5 rounded-lg font-semibold shadow-md shadow-primary/20"
              >
                Get Started
              </Button>
            </div>
          </div>
        </nav>
        <LandingHero />
        <footer className="text-center py-10 border-t border-border">
          <p className="text-xs text-muted-foreground/40">Built with care. Your emails are never stored without consent.</p>
        </footer>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as const, label: "Home", icon: LayoutDashboard },
    { id: "compose" as const, label: "Compose", icon: Sparkles },
    { id: "drafts" as const, label: "Drafts", icon: FileText },
    { id: "templates" as const, label: "Templates", icon: BookOpen },
    { id: "threads" as const, label: "Threads", icon: MessageSquare },
    { id: "signatures" as const, label: "Signatures", icon: PenLine },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "reminders" as const, label: "Reminders", icon: Bell },
  ];

  /* Panel content wrapper for non-compose tabs */
  const PanelPage = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="h-full overflow-y-auto relative z-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card/85 backdrop-blur-sm p-4 sm:p-6 space-y-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]">{children}</div>
      </div>
    </motion.div>
  );

  /* ── Authenticated workspace ── */
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-background via-background to-secondary/30 text-[15px] lg:text-base relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      {/* ── Header ── */}
      <header className="shrink-0 z-50 border-b border-border/70 bg-card/75 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[4.5rem]">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-base font-bold text-foreground tracking-tight">MailCraft</span>
              <span className="text-xs text-muted-foreground font-medium mt-0.5">AI Email Assistant</span>
            </div>
            <span className="sm:hidden font-display text-base font-bold text-foreground tracking-tight">MailCraft</span>
          </div>

          {/* Center tabs */}
          <nav className="hidden sm:flex items-center bg-secondary/45 rounded-2xl p-1.5 gap-1 border border-border/60 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activePanel === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                  <Icon className="h-3.5 w-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-background/80 text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all duration-200"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-muted-foreground/50">Search…</span>
              <kbd className="ml-0.5 pointer-events-none inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="h-10 px-1 text-muted-foreground hover:text-foreground"
            >
              <Avatar className="h-8 w-8 ring-2 ring-border">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Mobile tabs — wrapped grid to avoid right-side clipping */}
        <div className="sm:hidden px-3 pb-3">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activePanel === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap min-w-0
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground bg-secondary/55 border border-border/60"
                    }
                  `}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden relative z-10">
        {/* Compose — always mounted, smooth fade */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{
            opacity: activePanel === "compose" ? 1 : 0,
          }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            zIndex: activePanel === "compose" ? 10 : 0,
            pointerEvents: activePanel === "compose" ? "auto" : "none",
          }}
        >
          <div className="h-full p-3 sm:p-4 lg:p-5">
            <EmailComposer
              onDraftSaved={handleDraftSaved}
              draftToLoad={draftToLoad}
              onDraftLoaded={handleDraftLoaded}
              signature={activeSignature}
            />
          </div>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {activePanel === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full overflow-y-auto relative z-20"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <DashboardInsights onLoadDraft={handleLoadDraft} onSwitchTab={(t) => setActivePanel(t as any)} />
              </div>
            </motion.div>
          )}

          {activePanel === "drafts" && (
            <PanelPage key="drafts" title="Saved Drafts" description="Click a draft to open it in the composer.">
              <SavedDrafts key={draftsKey} onLoadDraft={handleLoadDraft} />
            </PanelPage>
          )}

          {activePanel === "templates" && (
            <PanelPage key="templates" title="Email Templates" description="Browse and use pre-built templates to get started quickly.">
              <TemplatesGallery onUseTemplate={(body) => {
                setDraftToLoad({ id: "", user_id: "", draft_body: body, created_at: "", updated_at: "", subject: "", recipient: "", tone: "Professional", context: "", language: "en", mode: "compose" });
                setActivePanel("compose");
              }} />
            </PanelPage>
          )}

          {activePanel === "signatures" && (
            <PanelPage key="signatures" title="Signatures" description="Create and manage your email signatures.">
              <SignatureBuilder onSignatureChange={setActiveSignature} />
            </PanelPage>
          )}

          {activePanel === "analytics" && (
            <PanelPage key="analytics" title="Analytics" description="Track your email activity and productivity.">
              <EmailAnalytics />
            </PanelPage>
          )}

          {activePanel === "threads" && (
            <PanelPage key="threads" title="Email Threads" description="Organize conversations and generate context-aware replies.">
              <EmailThreadBuilder />
            </PanelPage>
          )}

          {activePanel === "reminders" && (
            <PanelPage key="reminders" title="Reminders" description="Schedule reminders to follow up on your emails.">
              <ScheduleReminder />
            </PanelPage>
          )}
        </AnimatePresence>
      </main>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onSwitchTab={setActivePanel}
        onLoadDraft={handleLoadDraft}
      />
      <OnboardingTour />
    </div>
  );
};

export default Index;
