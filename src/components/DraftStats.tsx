import { Clock, Type, BookOpen } from "lucide-react";

interface DraftStatsProps {
  text: string;
}

const DraftStats = ({ text }: DraftStatsProps) => {
  if (!text) return null;

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Type className="h-3 w-3" />
        <span>{words} words</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        <span>{sentences} sentences</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{readingTime} min read</span>
      </div>
      <span className="text-xs text-muted-foreground/50">{chars} chars</span>
    </div>
  );
};

export default DraftStats;
