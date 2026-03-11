import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, PenLine, BarChart3, MessageSquare, Bell, ArrowRight, X } from "lucide-react";

const TOUR_KEY = "mailcraft_onboarding_complete";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to MailCraft! ✨",
    description: "Your AI-powered email assistant. Let's take a quick tour of the key features.",
    color: "text-primary",
  },
  {
    icon: Sparkles,
    title: "Compose with AI",
    description: "Write emails effortlessly — choose a tone, set context, and let AI generate a polished draft. Use Cmd+Enter to generate instantly.",
    color: "text-primary",
  },
  {
    icon: FileText,
    title: "Saved Drafts",
    description: "All your drafts are saved securely. Click any draft to reload it into the composer. Use Cmd+S to save quickly.",
    color: "text-blue-500",
  },
  {
    icon: PenLine,
    title: "Quick Refine",
    description: "One-click rewrites: make it shorter, add bullet points, simplify language, or add a call-to-action.",
    color: "text-emerald-500",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your productivity with streaks, peak hours heatmap, tone distribution, and weekly trends.",
    color: "text-amber-500",
  },
  {
    icon: MessageSquare,
    title: "Keyboard Shortcuts",
    description: "⌘K for command palette, ⌘Enter to generate, ⌘S to save. Work faster with shortcuts.",
    color: "text-purple-500",
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
}

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setVisible(true);
  }, []);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
    onComplete?.();
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl"
        >
          <button
            onClick={finish}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center ${current.color}`}>
              <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>

            {/* Progress dots */}
            <div className="flex gap-1.5 pt-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-secondary"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2 pt-2 w-full">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              <Button onClick={next} className="flex-1 gap-1.5">
                {step === steps.length - 1 ? "Get Started" : "Next"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Skip tour
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
