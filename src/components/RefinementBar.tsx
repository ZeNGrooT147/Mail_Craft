import { Button } from "@/components/ui/button";
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {quickActions.map(({ icon: Icon, label, instruction }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => onRefine(instruction)}
            disabled={disabled}
            className="h-9 px-2.5 text-xs gap-1.5 rounded-xl justify-center bg-background/60 border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default RefinementBar;
