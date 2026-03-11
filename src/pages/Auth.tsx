import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/cloud-auth/index";
import { Button } from "@/components/ui/button";
import {
  Mail, Loader2, ArrowLeft, Lock, Eye, EyeOff, ArrowRight,
  Sparkles, Zap, Shield, Globe, Star, CheckCircle2, Send, Palette, Languages,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

/* ── Shared easing ── */
const ease = [0.22, 1, 0.36, 1] as const;

/* ── Stagger helper ── */
const stagger = (i: number, base = 0.12) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: base + i * 0.08, duration: 0.5, ease },
});

/* ── Color tokens ── */
const c = {
  panelBg: "hsl(228, 22%, 10%)",
  panelText: "hsl(220, 15%, 92%)",
  panelMuted: "hsla(220, 12%, 70%, 0.55)",
  panelSubtle: "hsla(220, 15%, 30%, 0.35)",
  coral: "hsl(14, 80%, 56%)",
  coralLight: "hsl(14, 85%, 68%)",
  coralGlow: "hsla(14, 80%, 56%, 0.12)",
  coralBorder: "hsla(14, 80%, 56%, 0.18)",
  gold: "hsl(45, 93%, 58%)",
  formBg: "hsl(30, 25%, 98%)",
  formText: "hsl(228, 18%, 14%)",
  formMuted: "hsl(220, 10%, 52%)",
  inputBg: "hsl(0, 0%, 100%)",
  inputBorder: "hsl(30, 14%, 88%)",
  inputShadow: "0 1px 2px hsla(228, 18%, 14%, 0.04)",
};

const features = [
  { icon: Zap, label: "3-second drafts", sub: "Lightning fast" },
  { icon: Sparkles, label: "Smart tones", sub: "AI-powered" },
  { icon: Globe, label: "10+ languages", sub: "Global reach" },
  { icon: Shield, label: "100% private", sub: "End-to-end" },
];

/* ── Floating particles ── */
const particles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 3 + Math.random() * 4,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: 12 + Math.random() * 18,
  delay: Math.random() * 5,
  opacity: 0.08 + Math.random() * 0.12,
}));

/* ── Password strength ── */
const getPasswordStrength = (pw: string) => {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "hsl(0, 72%, 55%)" };
  if (score <= 2) return { score: 2, label: "Fair", color: "hsl(35, 90%, 52%)" };
  if (score <= 3) return { score: 3, label: "Good", color: "hsl(45, 93%, 50%)" };
  if (score <= 4) return { score: 4, label: "Strong", color: "hsl(142, 60%, 45%)" };
  return { score: 5, label: "Excellent", color: "hsl(142, 70%, 38%)" };
};

/* ── Product mockup (inline SVG-style) ── */
const ProductMockup = () => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: 0.8, duration: 0.8, ease }}
    className="mt-6 rounded-xl border overflow-hidden"
    style={{ background: "hsla(228, 18%, 14%, 0.6)", borderColor: c.panelSubtle }}
  >
    {/* Title bar */}
    <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: c.panelSubtle }}>
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0, 65%, 55%)" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(45, 90%, 55%)" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142, 60%, 45%)" }} />
      </div>
      <span className="text-[10px] font-medium ml-2" style={{ color: "hsla(220, 10%, 60%, 0.4)" }}>
        MailCraft — Compose
      </span>
    </div>

    {/* Mock content */}
    <div className="p-4 space-y-3">
      {/* To field */}
      <div className="flex items-center gap-2">
        <Send className="h-3 w-3" style={{ color: c.coralLight }} />
        <div className="h-2 rounded-full w-32" style={{ background: "hsla(220, 15%, 30%, 0.4)" }} />
      </div>
      {/* Subject */}
      <div className="flex items-center gap-2">
        <Mail className="h-3 w-3" style={{ color: "hsla(220, 12%, 70%, 0.35)" }} />
        <div className="h-2 rounded-full w-44" style={{ background: "hsla(220, 15%, 30%, 0.3)" }} />
      </div>
      {/* Divider */}
      <div className="h-px" style={{ background: c.panelSubtle }} />
      {/* Body lines */}
      <div className="space-y-2 pt-1">
        <div className="h-2 rounded-full w-full" style={{ background: "hsla(220, 15%, 30%, 0.25)" }} />
        <div className="h-2 rounded-full w-[85%]" style={{ background: "hsla(220, 15%, 30%, 0.2)" }} />
        <div className="h-2 rounded-full w-[70%]" style={{ background: "hsla(220, 15%, 30%, 0.15)" }} />
      </div>
      {/* Tone chips */}
      <div className="flex gap-1.5 pt-1">
        {[
          { icon: Palette, label: "Professional" },
          { icon: Sparkles, label: "Friendly" },
          { icon: Languages, label: "Translate" },
        ].map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold border"
            style={{
              background: chip.label === "Professional" ? c.coralGlow : "transparent",
              borderColor: chip.label === "Professional" ? c.coralBorder : c.panelSubtle,
              color: chip.label === "Professional" ? c.coralLight : "hsla(220, 12%, 70%, 0.4)",
            }}
          >
            <chip.icon className="h-2.5 w-2.5" />
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
);

const CartoonAccents = () => (
  <>
    <motion.div
      className="absolute top-[18%] right-[10%] h-10 w-10 rounded-2xl border flex items-center justify-center"
      style={{ background: "hsla(14, 80%, 56%, 0.16)", borderColor: "hsla(14, 80%, 56%, 0.34)" }}
      animate={{ y: [0, -8, 0], rotate: [0, 6, -4, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <Sparkles className="h-4 w-4" style={{ color: c.coralLight }} />
    </motion.div>

    <motion.div
      className="absolute bottom-[20%] right-[14%] h-9 w-9 rounded-full border flex items-center justify-center"
      style={{ background: "hsla(258, 65%, 58%, 0.18)", borderColor: "hsla(258, 65%, 58%, 0.32)" }}
      animate={{ y: [0, 10, 0], x: [0, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <Star className="h-3.5 w-3.5" style={{ color: "hsl(45, 93%, 58%)", fill: "hsl(45, 93%, 58%)" }} />
    </motion.div>

    <motion.div
      className="absolute top-[56%] right-[6%] h-11 w-11 rounded-2xl border flex items-center justify-center"
      style={{ background: "hsla(210, 70%, 52%, 0.16)", borderColor: "hsla(210, 70%, 52%, 0.30)" }}
      animate={{ y: [0, -6, 0], rotate: [0, -5, 5, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      <Send className="h-4 w-4" style={{ color: "hsl(220, 15%, 92%)" }} />
    </motion.div>
  </>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);

    const providerError =
      searchParams.get("error") ||
      hashParams.get("error") ||
      searchParams.get("error_code") ||
      hashParams.get("error_code");

    if (!providerError) return;

    const errorDescription =
      searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      "Login was cancelled or denied. Please try again.";

    toast.error(errorDescription.replace(/\+/g, " "));
    navigate("/auth", { replace: true });
  }, [location.search, location.hash, navigate]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: appUrl },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await auth.signInWithOAuth("google", {
        redirect_uri: `${appUrl}/auth`,
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent!");
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] relative overflow-hidden" style={{ background: "radial-gradient(120% 120% at 0% 100%, hsla(258, 65%, 58%, 0.32), transparent 56%), linear-gradient(145deg, hsl(228, 26%, 10%), hsl(232, 24%, 7%))" }}>
        <CartoonAccents />
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "radial-gradient(hsla(220, 12%, 86%, 0.28) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl" style={{ background: "hsla(14, 80%, 56%, 0.24)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl" style={{ background: "hsla(255, 68%, 58%, 0.20)" }} />

        <div className="relative z-10 flex flex-col w-full h-full px-8 py-9 xl:px-12 xl:py-12 2xl:px-14 2xl:py-14">
          <motion.button
            onClick={() => navigate("/")}
            {...stagger(0, 0)}
            className="flex items-center gap-3 group w-fit"
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center border group-hover:scale-105 transition-transform" style={{ background: c.coralGlow, borderColor: c.coralBorder }}>
              <Mail className="h-5 w-5" style={{ color: c.coral }} />
            </div>
            <span className="font-display text-lg font-bold" style={{ color: c.panelText }}>MailCraft</span>
          </motion.button>

          <div className="flex-1 flex flex-col justify-center max-w-[420px] xl:max-w-[520px] gap-8">
            <div>
              <motion.span
                {...stagger(1, 0.12)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border mb-5"
                style={{ background: "hsla(14, 80%, 56%, 0.14)", borderColor: "hsla(14, 80%, 56%, 0.28)", color: c.coralLight }}
              >
                <Star className="h-3 w-3" style={{ color: c.gold, fill: c.gold }} />
                Trusted by 10,000+ professionals
              </motion.span>

              <motion.h2
                {...stagger(2, 0.12)}
                className="font-display font-bold text-[2.1rem] xl:text-[2.8rem] leading-[1.08] tracking-[-0.03em]"
                style={{ color: c.panelText }}
              >
                Write better emails,
                <br />
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${c.coral}, ${c.coralLight})` }}>in less time.</span>
              </motion.h2>

              <motion.p
                {...stagger(3, 0.12)}
                className="mt-4 text-[14px] xl:text-[15px] leading-relaxed max-w-md"
                style={{ color: c.panelMuted }}
              >
                Draft, refine, and reply with AI support that keeps your tone sharp and your messages clear.
              </motion.p>
            </div>

            <div className="space-y-3.5 rounded-2xl p-4 border" style={{ background: "hsla(225, 22%, 12%, 0.45)", borderColor: "hsla(220, 16%, 40%, 0.32)", backdropFilter: "blur(6px)" }}>
              {features.map((f, i) => (
                <motion.div key={f.label} {...stagger(i, 0.28)} className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: c.coralGlow, borderColor: c.coralBorder }}>
                    <f.icon className="h-4 w-4" style={{ color: c.coralLight }} />
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold block leading-tight" style={{ color: c.panelText }}>{f.label}</span>
                    <span className="text-[11px] font-medium" style={{ color: c.panelMuted }}>{f.sub}</span>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 xl:p-10 relative" style={{ background: "linear-gradient(180deg, hsl(30, 25%, 98%), hsl(30, 22%, 96%))" }}>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full blur-[130px] pointer-events-none" style={{ background: "hsla(14, 80%, 56%, 0.06)" }} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="w-full max-w-[420px] rounded-[28px] border p-7 sm:p-8 shadow-xl"
          style={{ background: "hsla(0, 0%, 100%, 0.78)", borderColor: "hsla(30, 14%, 86%, 0.9)", backdropFilter: "blur(8px)", boxShadow: "0 14px 42px -20px hsla(228, 18%, 14%, 0.28)" }}
        >
          {/* Nav */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm font-medium group transition-colors"
              style={{ color: c.formMuted }}
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Home
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base font-bold" style={{ color: c.formText }}>MailCraft</span>
            </div>
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-7"
            >
              <h1 className="text-[1.75rem] font-display font-bold tracking-[-0.02em]" style={{ color: c.formText }}>
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-[15px] mt-1.5 leading-relaxed" style={{ color: c.formMuted }}>
                {isLogin ? "Sign in to continue to your workspace." : "Start crafting better emails in seconds."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Google */}
          <motion.div {...stagger(0, 0.12)}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 hover:shadow-md"
              style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.formText, boxShadow: c.inputShadow }}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div {...stagger(1, 0.12)} className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px" style={{ background: c.inputBorder }} />
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: "hsla(220, 10%, 52%, 0.45)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: c.inputBorder }} />
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div {...stagger(2, 0.12)} className="space-y-1.5">
              <label className="text-[13px] font-semibold" style={{ color: c.formText }}>Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px]" style={{ color: "hsla(220, 10%, 52%, 0.4)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-11 pr-4 h-12 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.formText, boxShadow: c.inputShadow }}
                />
              </div>
            </motion.div>

            <motion.div {...stagger(3, 0.12)} className="space-y-1.5">
              <label className="text-[13px] font-semibold" style={{ color: c.formText }}>Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px]" style={{ color: "hsla(220, 10%, 52%, 0.4)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 h-12 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.formText, boxShadow: c.inputShadow }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "hsla(220, 10%, 52%, 0.35)" }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength (signup only) */}
              {!isLogin && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-1.5 space-y-1"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: level <= strength.score ? strength.color : "hsla(220, 10%, 52%, 0.15)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {isLogin && (
              <motion.div {...stagger(4, 0.12)} className="flex justify-end">
                <button type="button" onClick={handleForgotPassword} className="text-[13px] font-semibold transition-colors text-primary/70 hover:text-primary">
                  Forgot password?
                </button>
              </motion.div>
            )}

            {/* Terms checkbox (signup only) */}
            {!isLogin && (
              <motion.div {...stagger(4, 0.12)} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-2 accent-primary cursor-pointer shrink-0"
                  style={{ borderColor: c.inputBorder }}
                />
                <label htmlFor="terms" className="text-[12px] leading-relaxed cursor-pointer" style={{ color: c.formMuted }}>
                  I agree to the{" "}
                  <button type="button" className="font-semibold underline underline-offset-2 text-primary/70 hover:text-primary transition-colors">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" className="font-semibold underline underline-offset-2 text-primary/70 hover:text-primary transition-colors">
                    Privacy Policy
                  </button>
                </label>
              </motion.div>
            )}

            <motion.div {...stagger(5, 0.12)}>
              <Button
                type="submit"
                disabled={loading || (!isLogin && !agreedToTerms)}
                className="w-full h-12 rounded-xl text-sm font-bold group transition-all duration-300 font-display hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${c.coral}, hsl(14, 85%, 48%))`,
                  boxShadow: "0 4px 14px hsla(14, 80%, 50%, 0.25)",
                  color: "white",
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Toggle */}
          <motion.p {...stagger(6, 0.12)} className="text-center text-sm mt-6" style={{ color: c.formMuted }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setAgreedToTerms(false); }}
              className="font-bold hover:underline underline-offset-4 decoration-primary/30 text-primary transition-colors"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </motion.p>

          {/* Trust badges (signup only) */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-6 pt-5 flex flex-col gap-2" style={{ borderTop: `1px solid ${c.inputBorder}` }}>
                  {["Free forever plan available", "No credit card required", "Setup in under 30 seconds"].map((t) => (
                    <div key={t} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      <span className="text-[12px] font-medium" style={{ color: c.formMuted }}>{t}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
