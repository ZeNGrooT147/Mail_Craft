import { cn } from "@/lib/utils";

const lengths = ["Short", "Medium", "Detailed"] as const;
export type EmailLength = (typeof lengths)[number];

interface LengthControlProps {
  selected: EmailLength;
  onSelect: (length: EmailLength) => void;
}

const LengthControl = ({ selected, onSelect }: LengthControlProps) => {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground">Length</span>
      <div className="grid grid-cols-3 gap-2">
        {lengths.map((len) => (
          <button
            key={len}
            onClick={() => onSelect(len)}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center",
              selected === len
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-secondary/50 text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground"
            )}
          >
            {len}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LengthControl;
