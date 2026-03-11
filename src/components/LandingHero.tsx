import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence, MotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Sparkles, Zap, Shield, Globe, PenLine,
  MessageSquareReply, MailCheck, Layers, ChevronDown, Star,
  Check, ArrowUpRight, Quote, ChevronUp, Plus, Minus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect, ReactNode } from "react";

/* ── Parallax section wrapper ── */
const ParallaxSection = ({ children, className, speed = 0.15 }: { children: ReactNode; className?: string; speed?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80 * speed, -80 * speed]);
  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
};

/* ── Floating parallax decorative orbs between sections ── */
const ParallaxOrb = ({ top, left, size, color, speed }: { top: string; left: string; size: string; color: string; speed: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [120 * speed, -120 * speed]);
  return (
    <div ref={ref} className="absolute pointer-events-none" style={{ top, left }}>
      <motion.div
        style={{ y, width: size, height: size }}
        className={`rounded-full blur-[80px] opacity-30 ${color}`}
      />
    </div>
  );
};

/* ── Gradient section divider ── */
const SectionDivider = ({ flip = false }: { flip?: boolean }) => (
  <div className={`relative h-10 sm:h-14 overflow-hidden ${flip ? "rotate-180" : ""}`}>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[60%] h-px"
      style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)" }}
    />
    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/20" />
  </div>
);

/* ── Noise texture SVG ── */
const NoiseSVG = () => (
  <svg className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

/* ── Animated gradient mesh ── */
const GradientMesh = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <motion.div
      className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full"
      style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)" }}
      animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0], scale: [1, 1.2, 0.9, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full"
      style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }}
      animate={{ x: [0, -120, 80, 0], y: [0, 100, -60, 0], scale: [1, 0.8, 1.3, 1] }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full"
      style={{ background: "radial-gradient(circle, hsl(var(--ring) / 0.06) 0%, transparent 70%)" }}
      animate={{ x: [0, 60, -40, 0], y: [0, -40, 80, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

/* ── Magnetic button wrapper ── */
const MagneticButton = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  return (
    <motion.div
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
};

/* ── Animated counter ── */
const AnimatedCounter = ({ target, suffix = "" }: { target: string; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const numericPart = parseInt(target.replace(/\D/g, "")) || 0;
  const prefix = target.replace(/[0-9]/g, "").startsWith("<") ? "<" : "";

  useEffect(() => {
    if (numericPart === 0) return;
    let start = 0;
    const step = Math.max(1, Math.floor(numericPart / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= numericPart) {
        setCount(numericPart);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [numericPart]);

  return <span>{prefix}{count}{suffix}{target.includes("+") ? "+" : ""}{target.includes("%") ? "%" : ""}{target.includes("s") && !target.includes("+") ? "s" : ""}</span>;
};

/* ── Reveal text character by character ── */
const CharReveal = ({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) => (
  <span className={className}>
    {text.split("").map((char, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + i * 0.018, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block"
      >
        {char === " " ? "\u00A0" : char}
      </motion.span>
    ))}
  </span>
);

/* ── Marquee strip ── */
const MarqueeStrip = () => {
  const items = ["AI Drafting", "Smart Replies", "9 Tones", "12 Templates", "Multi-Language", "Voice Input", "A/B Compare", "Writing Coach", "Compliance Check", "Snippets", "TL;DR Summary", "Task Extraction"];
  return (
    <div className="relative overflow-hidden py-6 border-y border-border/30">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: [0, -1800] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-sm text-muted-foreground/60 font-medium uppercase tracking-widest">
            <Star className="h-3 w-3 text-primary/40" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

/* ── data ── */
const features = [
  { icon: Zap, title: "Lightning Fast", desc: "Generate polished emails in seconds with 9 tone styles and 12 templates.", color: "from-primary/20 to-primary/5" },
  { icon: PenLine, title: "AI Writing Coach", desc: "Grammar, clarity, voice, jargon — get comprehensive writing feedback.", color: "from-primary/15 to-primary/5" },
  { icon: MessageSquareReply, title: "Smart Replies", desc: "TL;DR summaries, task extraction, quick replies with thread context.", color: "from-primary/20 to-primary/5" },
  { icon: Globe, title: "Multi-Language + Voice", desc: "Draft in 10+ languages. Dictate with voice input, listen with text-to-speech.", color: "from-primary/15 to-primary/5" },
  { icon: Shield, title: "Safety & Compliance", desc: "Sensitive data detection, toxicity filter, bias check, and attachment reminders.", color: "from-primary/20 to-primary/5" },
  { icon: Layers, title: "Power Tools", desc: "A/B drafts, cold email optimizer, snippets library, readability scoring.", color: "from-primary/15 to-primary/5" },
];

const stats = [
  { value: "12", suffix: "+", label: "Templates" },
  { value: "9", suffix: "", label: "Tone Styles" },
  { value: "<3", suffix: "s", label: "Draft Speed" },
  { value: "15", suffix: "+", label: "AI Tools" },
];

const steps = [
  { num: "01", title: "Describe your email", desc: "Pick a template, set the tone, and provide context — or just dictate with voice." },
  { num: "02", title: "AI crafts your draft", desc: "Get a polished email instantly with smart greetings and the perfect tone." },
  { num: "03", title: "Refine & send", desc: "Polish with A/B comparison, writing coach, compliance check — then send via Gmail or Outlook." },
];

/* ── Before / After Demo ── */
const beforeEmail = `Hi,

I wanted to talk about the project. Can you send me the files? I need them soon. Also we should probably meet sometime this week.

Thanks`;

const afterEmail = `Hi Sarah,

I hope your week is going well! I wanted to follow up on the Q2 campaign project. Could you share the latest design files by end of day Thursday?

I'd also love to schedule a 30-minute sync this week to align on next steps. Would Wednesday at 2pm work for you?

Looking forward to hearing from you!

Best regards,
Alex`;

const BeforeAfterSection = () => {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <section className="max-w-4xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">See The Difference</span>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-foreground tracking-tight mt-4">
          From rough to <span className="text-primary">remarkable</span>
        </h2>
        <p className="mt-4 text-muted-foreground max-w-md mx-auto font-body">
          Watch how AI transforms a casual draft into a polished, professional email.
        </p>
      </div>

      <div className="relative">
        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="inline-flex rounded-full border border-border bg-card p-1 gap-1"
            layout
          >
            <button
              onClick={() => setShowAfter(false)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold font-display transition-all duration-300 ${!showAfter ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
            >
              Before
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold font-display transition-all duration-300 ${showAfter ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
            >
              After AI ✨
            </button>
          </motion.div>
        </div>

        {/* Email cards */}
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={showAfter ? "after" : "before"}
              initial={{ opacity: 0, y: 20, rotateX: -5 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: 5 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
              style={{ boxShadow: showAfter ? "0 20px 60px -15px hsl(var(--primary) / 0.15)" : "var(--glass-shadow)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${showAfter ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <span className="text-xs font-medium text-muted-foreground font-body">
                    {showAfter ? "AI-Enhanced Draft" : "Original Draft"}
                  </span>
                </div>
                {showAfter && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider"
                  >
                    Polished
                  </motion.span>
                )}
              </div>
              {/* Body */}
              <div className="p-6">
                <pre className="text-sm text-foreground/80 font-body whitespace-pre-wrap leading-relaxed">
                  {showAfter ? afterEmail : beforeEmail}
                </pre>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

/* ── Testimonials ── */
const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Manager, Stripe",
    quote: "MailCraft cut my email time in half. The tone control is incredible — every email sounds exactly right.",
    rating: 5,
  },
  {
    name: "Marcus Williams",
    role: "Founder, NovaTech",
    quote: "I used to dread writing cold outreach emails. Now I draft 10x more in the same time with better results.",
    rating: 5,
  },
  {
    name: "Aisha Patel",
    role: "Head of Sales, Figma",
    quote: "The multi-language feature is a game changer for our global team. Polished emails in any language, instantly.",
    rating: 5,
  },
];

const TestimonialsSection = () => (
  <section className="max-w-5xl mx-auto px-4 py-14">
    <div className="text-center mb-10">
      <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Testimonials</span>
      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-foreground tracking-tight mt-4">
        Loved by <span className="text-primary">professionals</span>
      </h2>
    </div>

    <div className="grid sm:grid-cols-3 gap-6">
      {testimonials.map((t, i) => (
        <motion.div
          key={t.name}
          whileHover={{ y: -6, transition: { duration: 0.3 } }}
          className="rounded-3xl border border-border bg-card p-8 relative group hover:border-primary/20 transition-all duration-500"
        >
          {/* Quote icon */}
          <Quote className="h-8 w-8 text-primary/10 mb-4 group-hover:text-primary/20 transition-colors" />

          {/* Stars */}
          <div className="flex gap-0.5 mb-4">
            {Array.from({ length: t.rating }).map((_, j) => (
              <div key={j}>
                <Star className="h-4 w-4 text-primary fill-primary" />
              </div>
            ))}
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed font-body mb-6">"{t.quote}"</p>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary font-display">
                {t.name.split(" ").map(n => n[0]).join("")}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground font-display">{t.name}</p>
              <p className="text-xs text-muted-foreground font-body">{t.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

/* ── FAQ Accordion ── */
const faqs = [
  { q: "Is MailCraft really free?", a: "Yes! Our free plan lets you draft unlimited emails with AI. No credit card required, no hidden fees." },
  { q: "How does the AI know what tone to use?", a: "You select from 5 tone presets — Professional, Casual, Friendly, Persuasive, or Formal. The AI adapts its writing style, vocabulary, and structure to match." },
  { q: "Is my data private and secure?", a: "Absolutely. Your emails are never stored without your explicit consent. We use end-to-end encryption and never share your data with third parties." },
  { q: "Can I use MailCraft in other languages?", a: "Yes! MailCraft supports 10+ languages including Spanish, French, German, Japanese, and more. You can draft or translate emails instantly." },
  { q: "How is this different from ChatGPT?", a: "MailCraft is purpose-built for email. It understands email conventions, handles subject lines, signatures, tone control, and threading — things general AI tools don't optimize for." },
];

const FAQItem = ({ faq, index }: { faq: typeof faqs[0]; index: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="border-b border-border last:border-b-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-6 text-left group"
      >
        <span className="text-base font-semibold text-foreground font-display group-hover:text-primary transition-colors pr-4">
          {faq.q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 h-8 w-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors"
        >
          {isOpen ? <Minus className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground font-body leading-relaxed pb-6 pr-12">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQSection = () => (
  <section className="max-w-2xl mx-auto px-4 py-14">
    <div className="text-center mb-10">
      <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">FAQ</span>
      <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-foreground tracking-tight mt-4">
        Questions? <span className="text-primary">Answers.</span>
      </h2>
    </div>

    <div className="rounded-3xl border border-border bg-card p-2 sm:p-4">
      <div className="px-4 sm:px-6">
        {faqs.map((faq, i) => (
          <FAQItem key={i} faq={faq} index={i} />
        ))}
      </div>
    </div>
  </section>
);

/* ── Main component ── */
const LandingHero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
        <section
          className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-8 pb-28"
        >
          <motion.div className="relative z-10 text-center max-w-5xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-10"
            >
              <motion.span
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary tracking-wider uppercase"
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </motion.span>
                AI-Powered Email Drafting
              </motion.span>
            </motion.div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-extrabold leading-[0.9] tracking-tighter text-foreground">
              <CharReveal text="Emails that" delay={0.15} />
              <br />
              <CharReveal text="write " delay={0.35} />
              <motion.span
                className="relative inline-block text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <CharReveal text="themselves" delay={0.45} className="text-primary" />
                <motion.svg
                  viewBox="0 0 300 12"
                  className="absolute -bottom-2 left-0 w-full h-3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.path
                    d="M 0 8 Q 75 0 150 6 Q 225 12 300 4"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.svg>
              </motion.span>
            </h1>

            {/* Subtitle with staggered blur reveal */}
            <motion.p
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-10 text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed font-body"
            >
              MailCraft is an AI-native email assistant that composes, replies, and refines
              your emails — so you can focus on what matters.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.45 }}
              className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <MagneticButton>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="h-14 px-12 text-base rounded-full gap-3 group shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-500 font-display font-bold text-base relative overflow-hidden"
                >
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    Start Writing Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                  </span>
                </Button>
              </MagneticButton>
              <MagneticButton>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  className="h-14 px-12 text-base rounded-full gap-2 border-border hover:border-primary/30 font-display font-bold relative overflow-hidden group"
                >
                  See How It Works
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
              </MagneticButton>
            </motion.div>

            {/* Trust line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground/50"
            >
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary/60" /> No credit card</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary/60" /> Free forever plan</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary/60" /> 100% private</span>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-medium">Scroll</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground/30" />
            </motion.div>
          </motion.div>
        </section>

      {/* ═══ MARQUEE ═══ */}
      <MarqueeStrip />

      
      {/* ═══ EMAIL PREVIEW MOCKUP ═══ */}
      <section
        className="relative max-w-3xl mx-auto px-4 py-28"
      >
        {/* Background decorative elements */}
        <motion.div
          className="absolute -top-20 -left-20 w-64 h-64 bg-primary/6 rounded-full blur-[100px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-16 -right-16 w-48 h-48 bg-ring/8 rounded-full blur-[80px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />

        {/* Section header */}
        <div
          className="text-center mb-12"
        >
          <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Live Preview</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-foreground tracking-tight mt-4">
            See the <span className="text-primary">magic</span> happen
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto font-body text-sm">
            Watch AI compose a polished email in real-time — from blank canvas to send-ready.
          </p>
        </div>

        {/* Floating feature badges around the card */}
        {[
          { label: "Tone: Professional", x: "-12%", y: "20%", delay: 1.2 },
          { label: "Grammar ✓", x: "92%", y: "30%", delay: 1.8 },
          { label: "Readability: A+", x: "-8%", y: "70%", delay: 2.4 },
          { label: "No sensitive data", x: "88%", y: "75%", delay: 2.0 },
        ].map((badge, i) => (
          <div
            key={badge.label}
            className="absolute hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card/90 backdrop-blur-sm text-[10px] font-semibold text-muted-foreground shadow-lg z-20"
            style={{ left: badge.x, top: badge.y }}
          >
            <Check className="h-3 w-3 text-primary" />
            {badge.label}
          </div>
        ))}

        <motion.div
          className="rounded-3xl border border-border bg-card overflow-hidden relative"
          style={{ boxShadow: "0 40px 100px -20px hsl(var(--primary) / 0.12), 0 20px 40px -10px hsl(var(--foreground) / 0.05), 0 0 0 1px hsl(var(--border))" }}
          whileHover={{ y: -6, boxShadow: "0 50px 120px -20px hsl(var(--primary) / 0.18), 0 25px 50px -10px hsl(var(--foreground) / 0.08), 0 0 0 1px hsl(var(--primary) / 0.15)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Window chrome */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <motion.div className="w-3 h-3 rounded-full bg-destructive/60" whileHover={{ scale: 1.3 }} />
                <motion.div className="w-3 h-3 rounded-full bg-primary/40" whileHover={{ scale: 1.3 }} />
                <motion.div className="w-3 h-3 rounded-full bg-muted-foreground/20" whileHover={{ scale: 1.3 }} />
              </div>
              <span className="text-xs text-muted-foreground/60 font-medium font-body">New Email — MailCraft</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary uppercase tracking-wider"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                AI Active
              </motion.div>
            </div>
          </div>

          {/* Toolbar row */}
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border/50 bg-muted/10">
            {["Professional", "Casual", "Friendly"].map((tone, i) => (
              <span
                key={tone}
                className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${i === 0 ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground/50 bg-muted/30"}`}
              >
                {tone}
              </span>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground/40 font-body">
              English · Gmail
            </span>
          </div>

          {/* Email fields */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground/60 w-12 uppercase tracking-wider font-body">To</span>
              <div className="flex-1 h-9 rounded-xl bg-muted/40 flex items-center px-4">
                <span className="text-sm text-foreground/70 font-body">
                  sarah@designstudio.com
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground/60 w-12 uppercase tracking-wider font-body">Subj</span>
              <div className="flex-1 h-9 rounded-xl bg-muted/40 flex items-center px-4">
                <span className="text-sm text-foreground/70 font-body">
                  Project Proposal — Q2 Campaign
                </span>
              </div>
            </div>

            {/* Email body with typed text effect */}
            <div className="mt-4 rounded-2xl bg-muted/15 border border-border/30 p-5 min-h-[140px] relative">
              {["Hi Sarah,", "", "I hope this message finds you well! I wanted to reach out regarding the", "Q2 campaign proposal. Our team has put together a comprehensive plan", "that I believe aligns perfectly with your design vision.", "", "Would you be available for a quick call this week to discuss?"].map((line, i) => (
                <p
                  key={i}
                  className={`text-sm font-body leading-relaxed ${line === "" ? "h-3" : "text-foreground/70"} ${i === 0 ? "font-medium text-foreground/80" : ""}`}
                >
                  {line}
                </p>
              ))}
              {/* Typing cursor */}
              <motion.span
                className="inline-block w-[2px] h-4 bg-primary/60 ml-0.5 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>

            {/* Bottom status bar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <motion.div
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <MailCheck className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-xs text-primary font-semibold font-body tracking-wide">AI is drafting your email...</span>
              </motion.div>

              <div className="hidden sm:flex items-center gap-3">
                {[
                  { label: "Words: 52", delay: 2.0 },
                  { label: "Score: 94", delay: 2.2 },
                ].map((stat) => (
                  <span
                    key={stat.label}
                    className="text-[10px] text-muted-foreground/50 font-body font-medium"
                  >
                    {stat.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reflection glow */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/6 rounded-full blur-[80px]" />
      </section>

      <SectionDivider />

      {/* ═══ STATS ═══ */}
      
      <section className="relative py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-5 px-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="text-center group rounded-2xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden"
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.p
                className="text-4xl sm:text-5xl font-display font-extrabold text-foreground relative z-10"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {s.value === "<3" ? "<3" : s.value}{s.suffix}
              </motion.p>
              <p className="text-[11px] text-muted-foreground mt-2 uppercase tracking-[0.2em] font-semibold relative z-10">{s.label}</p>
              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-primary/30 rounded-full"
                style={{ width: "40%" }}
              />
            </motion.div>
          ))}
        </div>
      </section>
      

      <SectionDivider />

      {/* ═══ HOW IT WORKS ═══ */}
      
      <section className="max-w-3xl mx-auto px-4 py-14">
        <div
          className="text-center mb-10"
        >
          <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">How It Works</span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-foreground tracking-tight mt-4">
            Three steps to
            <br />
            <span className="text-primary">email bliss</span>
          </h2>
        </div>

        {/* Timeline layout */}
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-[27px] sm:left-[31px] top-0 w-[2px] bg-gradient-to-b from-primary/30 via-primary/15 to-transparent"
            style={{ height: "calc(100% - 2rem)" }}
          />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="flex items-start gap-5 group cursor-default"
              >
                {/* Timeline dot */}
                <div className="relative shrink-0 mt-1">
                  <motion.div
                    className="h-14 w-14 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center group-hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-500"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <span className="text-lg font-display font-extrabold text-primary">{step.num}</span>
                  </motion.div>
                  {/* Pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl border border-primary/10"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                  />
                </div>

                <div className="flex-1 rounded-2xl border border-border bg-card p-6 sm:p-8 group-hover:border-primary/20 group-hover:shadow-xl group-hover:shadow-primary/5 transition-all duration-500">
                  <h3 className="font-display font-bold text-lg text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 font-body leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      

      <SectionDivider flip />

      {/* ═══ FEATURES GRID ═══ */}
      
      <section id="features" className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-12">
          <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Features</span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-foreground tracking-tight mt-4">
            Everything you need
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto font-body">
            Powerful features designed for professionals who value clarity, speed, and impact.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -8, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              className="group rounded-3xl border border-border bg-card p-8 hover:border-primary/20 transition-all duration-500 relative overflow-hidden"
            >
              {/* Hover gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all duration-300 relative"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                >
                  <f.icon className="h-6 w-6 text-primary relative z-10" />
                  {/* Icon glow */}
                  <div className="absolute inset-0 rounded-2xl bg-primary/0 group-hover:bg-primary/10 blur-xl transition-all duration-500" />
                </motion.div>
                <h3 className="font-display font-bold text-foreground text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      

      <SectionDivider />
      <BeforeAfterSection />

      <SectionDivider flip />

      {/* ═══ TESTIMONIALS ═══ */}
      <TestimonialsSection />

      <SectionDivider />

      {/* ═══ FAQ ═══ */}
      <FAQSection />

      <SectionDivider flip />

      {/* ═══ FINAL CTA ═══ */}
      <section
        className="max-w-3xl mx-auto px-4 py-16 text-center"
      >
        <div className="rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-primary/5 p-10 sm:p-14 relative overflow-hidden">
          {/* Animated bg shapes */}
          <motion.div
            className="absolute top-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-[100px]"
            animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-56 h-56 bg-primary/6 rounded-full blur-[80px]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, delay: 2 }}
          />

          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-foreground relative z-10 tracking-tight leading-[1.05]"
          >
            Ready to transform
            <br />
            your <span className="text-primary">emails</span>?
          </h2>
          <p className="mt-5 text-muted-foreground relative z-10 max-w-sm mx-auto font-body text-base">
            Join thousands of professionals writing better emails, faster.
          </p>
          <MagneticButton className="relative z-10 mt-10 inline-block">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-12 text-base rounded-full gap-3 group shadow-2xl shadow-primary/30 font-display font-bold relative overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
              />
              <span className="relative z-10 flex items-center gap-2">
                Get Started — It's Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </span>
            </Button>
          </MagneticButton>
        </div>
      </section>
    </div>
  );
};

export default LandingHero;
