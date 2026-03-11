import {
  Minus, Plus, Smile, Briefcase, AlertTriangle, Wand2,
  List, Zap, MessageSquare,
} from "lucide-react";

interface RefinementBarProps {
  onRefine: (instruction: string) => void;
  disabled?: boolean;
}

const quickActions = [
  { icon: Minus, label: "Shorter", instruction: "Make this email more concise and shorter. Remove any unnecessary words or sentences." },
  { icon: Plus, label: "Longer", instruction: "Expand this email with more detail and context. Add supporting points." },
  { icon: Smile, label: "Friendlier", instruction: "Make this email warmer and more friendly in tone while keeping it professional." },
  { icon: Briefcase, label: "Formal", instruction: "Make this email more formal and professional in tone." },
  { icon: AlertTriangle, label: "Urgent", instruction: "Add a sense of urgency to this email. Emphasize the time-sensitivity." },
  { icon: Wand2, label: "Polish", instruction: "Polish this email for maximum clarity, flow, and impact. Fix any awkward phrasing." },
  { icon: List, label: "Bullets", instruction: "Restructure the key points of this email into clear bullet points for easy scanning. Keep the greeting and sign-off." },
  { icon: Zap, label: "Simplify", instruction: "Simplify the language in this email. Use shorter words, simpler sentences. Make it easy for anyone to understand." },
  { icon: MessageSquare, label: "Add CTA", instruction: "Add a clear call-to-action at the end of this email. Make it obvious what the recipient should do next." },
  { icon: Smile, label: "Soften", instruction: "Soften the tone of this email. Remove any aggressive, harsh, or confrontational language. Make it more diplomatic and empathetic while preserving the message." },
];

const RefinementBar = ({ onRefine, disabled }: RefinementBarProps) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
        {quickActions.map(({ icon: Icon, label, instruction }) => (
          <button
            key={label}
            onClick={() => onRefine(instruction)}
            disabled={disabled}
            className="group relative h-11 sm:h-11 lg:h-12 px-3 sm:px-4 rounded-lg lg:rounded-xl text-xs sm:text-xs lg:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-b from-background/80 to-background border border-border/60 hover:border-primary/40 hover:bg-gradient-to-b hover:from-primary/10 hover:to-background/90 hover:shadow-lg hover:shadow-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-foreground/70 group-hover:text-primary transition-colors" />
            <span className="line-clamp-1 text-foreground group-hover:text-primary transition-colors">{label}</span>
            <div className="absolute inset-0 rounded-lg lg:rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RefinementBar;
