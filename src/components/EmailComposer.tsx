import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import ToneSelector, { type Tone } from "@/components/ToneSelector";
import TemplateSelector, { type EmailTemplate } from "@/components/TemplateSelector";
import LanguageSelector, { type LanguageCode, languages } from "@/components/LanguageSelector";
import LengthControl, { type EmailLength } from "@/components/LengthControl";
import SubjectLineSuggestions from "@/components/SubjectLineSuggestions";
import DraftStats from "@/components/DraftStats";
import ReadabilityScore from "@/components/ReadabilityScore";
import RefinementBar from "@/components/RefinementBar";
import GrammarCheck from "@/components/GrammarCheck";
import ToneAnalyzer from "@/components/ToneAnalyzer";
import EmailSummarizer from "@/components/EmailSummarizer";
import QuickReplySuggestions from "@/components/QuickReplySuggestions";
import SnippetsLibrary from "@/components/SnippetsLibrary";
import SensitiveInfoCheck, { detectSensitiveInfo, detectAttachmentIntent } from "@/components/SensitiveInfoCheck";
import DraftComparison from "@/components/DraftComparison";
import ColdEmailOptimizer from "@/components/ColdEmailOptimizer";
import EmailToTask from "@/components/EmailToTask";
import ComplianceCheck from "@/components/ComplianceCheck";
import VoiceInput from "@/components/VoiceInput";
import TextToSpeech from "@/components/TextToSpeech";
import EmailCategoryBadge from "@/components/EmailCategoryBadge";
import LinkDetector from "@/components/LinkDetector";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailEvents } from "@/hooks/useEmailEvents";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  Sparkles, Copy, Trash2, Loader2, Mail, ArrowRight,
  CheckCircle2, Send, MessageSquareReply, PenLine,
  ChevronDown, ChevronUp, Save, ExternalLink,
  Wand2, ShieldCheck, GitCompare, Target, ShieldAlert,
  BarChart3, Zap, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-email`;

type Mode = "compose" | "reply";

interface EmailComposerProps {
  onDraftSaved?: () => void;
  draftToLoad?: Tables<"email_drafts"> | null;
  onDraftLoaded?: () => void;
  signature?: string | null;
}

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const EmailComposer = ({ onDraftSaved, draftToLoad, onDraftLoaded, signature }: EmailComposerProps) => {
  const { user } = useAuth();
  const { trackEvent } = useEmailEvents();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [incomingEmail, setIncomingEmail] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [length, setLength] = useState<EmailLength>("Medium");
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<Mode>("compose");
  const [activeTemplateId, setActiveTemplateId] = useState<string>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [refinementInput, setRefinementInput] = useState("");
  const [sensitiveDialogOpen, setSensitiveDialogOpen] = useState(false);
  const [sensitiveWarnings, setSensitiveWarnings] = useState<string[]>([]);
  const [analysisKey, setAnalysisKey] = useState(0);
  const [draftEditedSinceAnalysis, setDraftEditedSinceAnalysis] = useState(false);
  const [openToolSection, setOpenToolSection] = useState<string | null>(null);
  const [pendingSendAction, setPendingSendAction] = useState<(() => void) | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const generateDraftRef = useRef<(() => void) | null>(null);
  const saveDraftRef = useRef<(() => void) | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const refineSectionRef = useRef<HTMLDivElement | null>(null);
  const toolsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); generateDraftRef.current?.(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveDraftRef.current?.(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (draftToLoad) {
      setTo(draftToLoad.recipient || "");
      setSubject(draftToLoad.subject || "");
      setContext(draftToLoad.context || "");
      setTone((draftToLoad.tone as Tone) || "Professional");
      setLanguage((draftToLoad.language as LanguageCode) || "en");
      setDraft(draftToLoad.draft_body);
      setMode((draftToLoad.mode as Mode) || "compose");
      setActiveTemplateId(undefined);
      setLoadedDraftId(draftToLoad.id || null);
      onDraftLoaded?.();
      toast.success("Draft loaded!");
    }
  }, [draftToLoad, onDraftLoaded]);

  const langLabel = languages.find((l) => l.code === language)?.label || "English";

  const streamResponse = useCallback(
    async (messages: { role: string; content: string }[], aiMode: string, onChunk: (full: string) => void) => {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ messages, mode: aiMode }),
      });
      if (resp.status === 429) { toast.error("Rate limit exceeded."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) { toast.error("Failed to generate."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") return;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { fullText += content; onChunk(fullText); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    },
    []
  );

  const lengthInstruction = length === "Short" ? "\n- Length: Keep it very brief (2-3 sentences max)" : length === "Detailed" ? "\n- Length: Write a detailed, thorough email with full explanations" : "";

  const generateDraft = useCallback(async () => {
    if (mode === "reply" && !incomingEmail.trim()) { toast.error("Paste the email you want to reply to."); return; }
    if (mode === "compose" && !subject.trim() && !context.trim()) { toast.error("Please provide a subject or context."); return; }

    const existingDraft = draft.trim();
    setIsGenerating(true);
    setDraft("");
    const langInstruction = language !== "en" ? `\n- Language: Write the email in ${langLabel}` : "";
    const greeting = getTimeGreeting();

    let userContent: string;
    if (existingDraft) {
      userContent = `Here is my current edited email draft:\n\n${existingDraft}\n\nPlease regenerate this draft by improving it while preserving my intent and key edits.\n- Mode: ${mode}\n- Recipient: ${to || "Not specified"}\n- Subject: ${subject || "Not specified"}\n- Additional context: ${context || "Not specified"}\n- Tone: ${tone}\n- Use a time-appropriate greeting like "${greeting}"${langInstruction}${lengthInstruction}\n\nReturn only the final email body, ready to send.`;
    } else if (mode === "reply") {
      userContent = `Here is the email I received:\n\n${incomingEmail}\n\nContext for my reply: ${context || "Not specified"}\n- Tone: ${tone}\n- Use a time-appropriate greeting like "${greeting}"${langInstruction}${lengthInstruction}`;
    } else {
      userContent = `Draft an email with the following details:\n- Recipient: ${to || "Not specified"}\n- Subject: ${subject || "Not specified"}\n- Context/Key points: ${context || "Not specified"}\n- Tone: ${tone}\n- Use a time-appropriate greeting like "${greeting}"${langInstruction}${lengthInstruction}\n\nWrite only the email body, no subject line. Make it ready to send.`;
    }

    try {
      await streamResponse([{ role: "user", content: userContent }], mode === "reply" ? "reply" : "draft", (full) => setDraft(full));
      trackEvent("draft_created");
      // Auto-trigger all AI analysis tools
      setAnalysisKey((k) => k + 1);
      setDraftEditedSinceAnalysis(false);
    } catch (e) { console.error(e); toast.error("Something went wrong."); }
    finally { setIsGenerating(false); }
  }, [draft, to, subject, context, tone, language, langLabel, length, lengthInstruction, mode, incomingEmail, streamResponse, trackEvent]);

  generateDraftRef.current = generateDraft;
  saveDraftRef.current = draft && user ? async () => {
    const { error } = await supabase.from("email_drafts").insert({
      user_id: user.id, recipient: to, subject, context, tone, language, draft_body: draft, mode,
    });
    if (error) toast.error("Failed to save.");
    else { toast.success("Saved!"); onDraftSaved?.(); }
  } : null;

  const refineDraft = useCallback(
    async (instruction: string) => {
      if (!draft.trim()) { toast.error("Generate a draft first."); return; }
      setIsGenerating(true);
      const previousDraft = draft;
      setDraft("");
      try {
        await streamResponse(
          [{ role: "user", content: `Here is the current email draft:\n\n${previousDraft}\n\nPlease refine it with this instruction: ${instruction}` }],
          "refine",
          (full) => setDraft(full)
        );
        trackEvent("draft_refined");
      } catch { toast.error("Failed to refine."); setDraft(previousDraft); }
      finally { setIsGenerating(false); }
    },
    [draft, streamResponse, trackEvent]
  );

  const handleCustomRefinement = () => {
    if (!refinementInput.trim()) return;
    refineDraft(refinementInput);
    setRefinementInput("");
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSubject(template.subject);
    setContext(template.context);
    setActiveTemplateId(template.id);
    setMode("compose");
    toast.success(`"${template.name}" template applied!`);
  };

  const handleQuickReplySelect = (reply: string) => {
    setContext(reply);
    toast.success("Quick reply selected as context.");
  };

  const handleSnippetInsert = (body: string) => {
    setContext((prev) => prev ? prev + "\n" + body : body);
    toast.success("Snippet inserted!");
  };

  const handleVoiceTranscript = (text: string) => {
    setContext((prev) => prev ? prev + " " + text : text);
    toast.success("Voice input added!");
  };

  const plainBody = (draft + (signature || "")).replace(/[*_#>`\-~\[\]()]/g, "").trim();

  const copyDraft = () => {
    navigator.clipboard.writeText(draft + (signature || ""));
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const safeOpen = (url: string, label: string) => {
    try {
      const opened = window.open(url, "_blank");
      if (!opened) { navigator.clipboard.writeText(url); toast.info(`Pop-up blocked. ${label} link copied to clipboard.`); }
    } catch { navigator.clipboard.writeText(url); toast.info(`${label} link copied to clipboard.`); }
  };

  const checkAndSend = (action: () => void) => {
    if (detectAttachmentIntent(draft) && !draft.toLowerCase().includes("[attachment]")) {
      toast.warning("Your email mentions attachments — don't forget to attach files after opening your email client!", { duration: 5000 });
    }
    const warnings = detectSensitiveInfo(draft);
    if (warnings.length > 0) {
      setSensitiveWarnings(warnings);
      setPendingSendAction(() => action);
      setSensitiveDialogOpen(true);
      return;
    }
    action();
  };

  const openInGmail = () => {
    const authUser = user?.email ? `&authuser=${encodeURIComponent(user.email)}` : "";
    safeOpen(`https://mail.google.com/mail/?view=cm${authUser}&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`, "Gmail");
    trackEvent("sent_gmail");
  };

  const openInOutlook = () => {
    safeOpen(`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`, "Outlook");
    trackEvent("sent_outlook");
  };

  const clearAll = async () => {
    if (loadedDraftId) {
      const { error } = await supabase.from("email_drafts").delete().eq("id", loadedDraftId);
      if (error) {
        toast.error("Failed to delete draft.");
        return;
      }
      toast.success("Draft deleted.");
      setLoadedDraftId(null);
      onDraftSaved?.(); // refresh drafts list
    }
    setTo(""); setSubject(""); setContext(""); setIncomingEmail(""); setDraft("");
    setActiveTemplateId(undefined); setRefinementInput("");
  };

  const hasDraft = draft || isGenerating;

  const jumpToSection = (section: "refine" | "tools") => {
    const target = section === "refine" ? refineSectionRef.current : toolsSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ── Left panel: compose form ── */
  const leftPanel = (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Header with mode toggle */}
      <div className="px-5 pt-5 pb-4 border-b border-border/80 bg-gradient-to-b from-card to-card/90">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <PenLine className="h-4 w-4 text-primary-foreground" />
            </motion.div>
            <div>
              <h2 className="text-lg font-display font-bold text-foreground tracking-tight">Compose Workspace</h2>
              <p className="text-xs text-muted-foreground">Fast drafting, refining, and sending</p>
            </div>
          </div>
          <div className="flex gap-px p-0.5 rounded-xl border border-border bg-secondary/40 shadow-sm">
            <motion.button
              onClick={() => setMode("compose")}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === "compose" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              Compose
            </motion.button>
            <motion.button
              onClick={() => setMode("reply")}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === "reply" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquareReply className="h-3.5 w-3.5" />
              Reply
            </motion.button>
          </div>
        </div>

      </div>

      {/* Form body */}
      <div className="px-5 py-4 pb-5 space-y-4 bg-gradient-to-b from-background/40 to-background">
        {/* Templates — now scrolls naturally with the form */}
        {mode === "compose" && (
          <TemplateSelector onSelect={handleTemplateSelect} activeId={activeTemplateId} />
        )}

        {/* Reply textarea + analysis */}
        {mode === "reply" && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Incoming Email</label>
            <textarea
              value={incomingEmail}
              onChange={(e) => setIncomingEmail(e.target.value)}
              placeholder="Paste the email you received…"
              rows={4}
              className="w-full bg-background rounded-xl border border-border/90 p-4 text-base text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
            {incomingEmail.trim() && (
              <div className="space-y-1.5">
                <EmailCategoryBadge emailText={incomingEmail} />
                <CollapsibleSection title="AI Summary & Actions" icon={Sparkles}>
                  <div className="space-y-1.5">
                    <EmailSummarizer emailText={incomingEmail} />
                    <EmailToTask emailText={incomingEmail} />
                  </div>
                </CollapsibleSection>
                <CollapsibleSection title="Quick Reply Suggestions" icon={Zap}>
                  <QuickReplySuggestions emailText={incomingEmail} onSelectReply={handleQuickReplySelect} />
                </CollapsibleSection>
              </div>
            )}
          </div>
        )}

        {/* Compose fields */}
        {mode === "compose" && (
          <div className="rounded-2xl border border-border/90 bg-card/95 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center px-4 border-b border-border/70">
              <span className="text-xs font-bold text-foreground/75 w-16 shrink-0 uppercase tracking-wider">To</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground py-3.5"
              />
            </div>
            <div className="flex items-center px-4">
              <span className="text-xs font-bold text-foreground/75 w-16 shrink-0 uppercase tracking-wider">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setActiveTemplateId(undefined); }}
                placeholder="What's this email about?"
                className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground py-3.5"
              />
            </div>
          </div>
        )}

        {/* Context with voice input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary/50" />
            {mode === "reply" ? "Reply Context" : "Context & Key Points"}
          </label>
          <div className="relative group">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={mode === "reply" ? "Context for your reply…" : "Key points, instructions, or what you want to say…"}
              rows={4}
              className="w-full bg-card rounded-2xl border border-border/90 p-4 pr-10 text-base text-foreground placeholder:text-muted-foreground resize-y outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all min-h-[120px] max-h-[300px] group-hover:border-primary/20"
            />
            <div className="absolute top-3 right-3">
              <VoiceInput onTranscript={handleVoiceTranscript} />
            </div>
          </div>
        </div>

        {/* Tone & Length */}
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-primary/50" />
              Tone
            </span>
            <ToneSelector selected={tone} onSelect={setTone} />
          </div>
          <LengthControl selected={length} onSelect={setLength} />
        </div>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm text-primary/80 hover:text-primary transition-colors font-bold"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showAdvanced ? "Less options" : "More options"}
        </button>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-1.5"
          >
            <CollapsibleSection title="Language" icon={Sparkles} defaultOpen>
              <LanguageSelector selected={language} onSelect={setLanguage} />
            </CollapsibleSection>
            {user && (
              <CollapsibleSection title="Snippets Library" icon={Zap}>
                <SnippetsLibrary onInsert={handleSnippetInsert} />
              </CollapsibleSection>
            )}
          </motion.div>
        )}
      </div>

      {/* Generate button — sticky bottom */}
      <div className="px-5 py-4 border-t border-border/80 bg-gradient-to-t from-card to-card/90">
        <Button
          size="lg"
          onClick={generateDraft}
          disabled={isGenerating}
          className="w-full h-14 text-base rounded-2xl group font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] transition-all duration-300"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4.5 w-4.5" />
              {mode === "reply" ? "Generate Reply" : "Generate Draft"}
              <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground/60 text-center mt-2 font-medium">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px] font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px] font-mono">↵</kbd> to generate
        </p>
      </div>
    </div>
  );

  /* ── Right panel: draft output ── */
  const toolTabs = [
    { id: "tone", icon: BarChart3, label: "Tone" },
    { id: "ab", icon: GitCompare, label: "A/B Test" },
    { id: "coach", icon: ShieldCheck, label: "Coach" },
    { id: "compliance", icon: ShieldAlert, label: "Compliance" },
    ...(activeTemplateId === "cold-outreach" ? [{ id: "cold", icon: Target, label: "Optimizer" }] : []),
    ...(mode === "compose" ? [{ id: "subjects", icon: Sparkles, label: "Subjects" }] : []),
  ];

  const rightPanel = (
    <div className="flex flex-col h-full custom-scrollbar">
      <AnimatePresence mode="wait">
        {hasDraft ? (
          <motion.div
            key="draft-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            {/* ── Top Bar ── */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-border bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-md shadow-[0_8px_25px_-20px_rgba(0,0,0,0.65)]">
              <div className="flex items-center gap-2.5">
                {isGenerating ? (
                  <motion.div className="flex items-center gap-2">
                    <motion.div
                      className="h-2.5 w-2.5 rounded-full bg-primary"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <span className="text-xs font-semibold text-primary animate-pulse font-display">Generating…</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm shadow-primary/25">
                      <Mail className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-base font-bold text-foreground font-display tracking-tight">
                        {mode === "reply" ? "Your Reply" : "Your Email"}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium mt-0.5">Ready to send</span>
                    </div>
                  </motion.div>
                )}
              </div>
              {draft && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1"
                >
                  {user && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { error } = await supabase.from("email_drafts").insert({
                              user_id: user.id, recipient: to, subject, context, tone, language, draft_body: draft, mode,
                            });
                            if (error) toast.error("Failed to save.");
                            else { toast.success("Saved!"); onDraftSaved?.(); }
                          }}
                          className="h-9 px-3.5 text-sm gap-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        >
                          <Save className="h-3.5 w-3.5" /> Save
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save draft (⌘S)</TooltipContent>
                    </Tooltip>
                  )}
                  <TextToSpeech text={draft} />
                  <Button variant="ghost" size="sm" onClick={copyDraft} className="h-9 px-3.5 text-sm gap-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors font-medium">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkAndSend(openInGmail)}
                        className="h-9 px-3.5 text-sm gap-1.5 rounded-lg border-primary/15 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 font-medium"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Gmail
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">Open in Gmail</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkAndSend(openInOutlook)}
                        className="h-9 px-3.5 text-sm gap-1.5 rounded-lg border-primary/15 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 font-medium"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Outlook
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">Open in Outlook</TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* ── Draft Body — THE HERO ── */}
            <div ref={rightScrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {draft ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -1 }}
                  className="m-5 rounded-3xl border border-border bg-card/95 shadow-[0_22px_45px_-26px_rgba(0,0,0,0.45)] relative overflow-hidden"
                >
                  {/* Decorative top accent bar */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/80 to-transparent" />
                  
                  {/* Subject line display */}
                  {subject && (
                    <div className="px-6 pt-5 pb-0">
                      <p className="text-xs font-bold text-primary/60 uppercase tracking-[0.15em] mb-1">Subject</p>
                      <p className="text-lg font-display font-bold text-foreground leading-tight">{subject}</p>
                    </div>
                  )}

                  <div className="px-6 py-5">
                    <textarea
                      value={draft + (signature || "")}
                      onChange={(e) => {
                        const sig = signature || "";
                        const val = e.target.value;
                        if (sig && val.endsWith(sig)) setDraft(val.slice(0, -sig.length));
                        else setDraft(val);
                        setDraftEditedSinceAnalysis(true);
                      }}
                      className="w-full min-h-[300px] bg-transparent text-[19px] text-foreground leading-[2] resize-none outline-none font-body selection:bg-primary/20"
                      style={{ height: `${Math.max(300, draft.split('\n').length * 32)}px` }}
                    />
                  </div>

                  {/* Inline stats bar */}
                  <div className="px-6 py-3 border-t border-border bg-card/95">
                    <div className="flex items-center gap-3 flex-wrap">
                      <DraftStats text={draft} />
                      <div className="h-3 w-px bg-border hidden sm:block" />
                      <ReadabilityScore text={draft} />
                      <div className="h-3 w-px bg-border hidden sm:block" />
                      <LinkDetector text={draft} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center gap-4 text-muted-foreground px-6 py-7">
                  <div className="relative">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <div className="absolute inset-0 h-6 w-6 rounded-full bg-primary/20 animate-ping" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground font-display">Writing your email…</span>
                    <p className="text-base text-muted-foreground mt-0.5">AI is crafting a {tone.toLowerCase()} {mode === "reply" ? "reply" : "draft"}</p>
                  </div>
                </div>
              )}

              {draft && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="px-4 pb-6 space-y-3"
                >
                  <div className="rounded-2xl border border-border/70 bg-card/80 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">Discover features:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => jumpToSection("refine")}
                        className="h-8 px-3 text-xs rounded-lg"
                      >
                        Jump to Refine
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => jumpToSection("tools")}
                        className="h-8 px-3 text-xs rounded-lg"
                      >
                        Jump to AI Tools
                      </Button>
                    </div>
                  </div>

                  {/* Regenerate All button */}
                  {draftEditedSinceAnalysis && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAnalysisKey((k) => k + 1); setDraftEditedSinceAnalysis(false); }}
                      className="w-full h-9 text-xs gap-2 rounded-xl border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all font-bold"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate All Analysis
                    </Button>
                  )}

                  {/* ── Refine & Polish — persistent hero card ── */}
                  <div ref={refineSectionRef} className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 space-y-3 shadow-sm hover:shadow-md hover:shadow-primary/10 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center"
                        whileHover={{ scale: 1.1, rotate: -10 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Wand2 className="h-4 w-4 text-primary" />
                      </motion.div>
                      <div>
                        <span className="text-base font-bold text-foreground font-display">Refine & Polish</span>
                        <p className="text-xs text-muted-foreground">Quick-edit your draft with one click</p>
                      </div>
                    </div>
                    <RefinementBar onRefine={refineDraft} disabled={isGenerating} />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCustomRefinement()}
                        placeholder="Custom refinement instruction…"
                        className="flex-1 h-10 bg-background rounded-xl px-3.5 border border-input text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                      />
                      <Button variant="outline" size="sm" onClick={handleCustomRefinement} disabled={!refinementInput.trim() || isGenerating} className="h-10 px-3.5 rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* ── AI Tools ── */}
                  <div ref={toolsSectionRef} className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-sm">
                    <div className="flex items-center gap-1 px-2 py-2 bg-secondary/30">
                      {toolTabs.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = openToolSection === tool.id;
                        return (
                          <motion.button
                            key={tool.id}
                            onClick={() => setOpenToolSection(isActive ? null : tool.id)}
                            whileHover={{ y: -1, scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`
                              relative flex items-center justify-center gap-1.5 flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200
                              ${isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                              }
                            `}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="truncate max-w-full leading-tight">{tool.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="active-tool-indicator"
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-current"
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      {openToolSection && (
                        <motion.div
                          key={openToolSection}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 border-t border-border/50">
                            {openToolSection === "tone" && <ToneAnalyzer text={draft} triggerKey={analysisKey} />}
                            {openToolSection === "ab" && <DraftComparison currentDraft={draft} onPickDraft={setDraft} />}
                            {openToolSection === "coach" && <GrammarCheck emailBody={draft} triggerKey={analysisKey} />}
                            {openToolSection === "compliance" && <ComplianceCheck emailBody={draft} triggerKey={analysisKey} />}
                            {openToolSection === "cold" && <ColdEmailOptimizer emailBody={draft} />}
                            {openToolSection === "subjects" && <SubjectLineSuggestions emailBody={draft} context={context} onSelectSubject={(s) => setSubject(s)} triggerKey={analysisKey} />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── Empty state ── */
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-10 bg-gradient-to-b from-background to-card/30"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="relative mx-auto w-20 h-20">
                <motion.div
                  className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/10"
                  animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-2 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent flex items-center justify-center"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                >
                  <Mail className="h-8 w-8 text-primary/50" />
                </motion.div>
              </div>
              <div>
                <p className="text-xl font-display font-bold text-foreground">Your email will appear here</p>
                <p className="text-base text-muted-foreground mt-2 max-w-[360px] mx-auto leading-relaxed">
                  Fill in the details on the left and hit <span className="font-bold text-gradient-primary">Generate</span> to craft your email with AI.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { icon: Wand2, label: "AI Refine" },
                  { icon: GitCompare, label: "A/B Compare" },
                  { icon: ShieldCheck, label: "Writing Coach" },
                  { icon: BarChart3, label: "Tone Analysis" },
                  { icon: ShieldAlert, label: "Compliance" },
                  { icon: Target, label: "Optimizer" },
                ].map((item, i) => (
                  <motion.span
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50 hover:border-primary/20 hover:text-foreground transition-all"
                  >
                    <item.icon className="h-3 w-3" /> {item.label}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SensitiveInfoCheck
        open={sensitiveDialogOpen}
        onOpenChange={setSensitiveDialogOpen}
        warnings={sensitiveWarnings}
        onProceed={() => {
          setSensitiveDialogOpen(false);
          pendingSendAction?.();
        }}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full gap-0 rounded-3xl border border-border/80 bg-card/95 overflow-hidden"
      style={{ boxShadow: "var(--shadow-elevated)" }}
    >
      {/* Left: form */}
      <div className="w-full sm:w-[500px] shrink-0 border-r border-border/80 bg-card/95">
        {leftPanel}
      </div>
      {/* Right: output */}
      <div className={`flex-1 min-w-0 ${!hasDraft ? "hidden sm:flex" : "flex"} flex-col bg-gradient-to-b from-background to-background/90`}>
        {rightPanel}
      </div>
    </motion.div>
  );
};

export default EmailComposer;
