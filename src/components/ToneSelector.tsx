import { cn } from "@/lib/utils";

const tones = ["Professional", "Casual", "Friendly", "Formal", "Persuasive", "Empathetic", "Apologetic", "Confident", "Urgent"] as const;
export type Tone = (typeof tones)[number];

interface ToneSelectorProps {
  selected: Tone;
  onSelect: (tone: Tone) => void;
}

const ToneSelector = ({ selected, onSelect }: ToneSelectorProps) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tones.map((tone) => (
        <button
          key={tone}
          onClick={() => onSelect(tone)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center",
            selected === tone
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-secondary/50 text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground"
          )}
        >
          {tone}
        </button>
      ))}
    </div>
  );
};

export default ToneSelector;
