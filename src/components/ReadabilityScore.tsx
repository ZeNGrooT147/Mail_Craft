import { BookOpen } from "lucide-react";

interface ReadabilityScoreProps {
  text: string;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschKincaid(text: string): { grade: number; label: string } {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return { grade: 0, label: "N/A" };
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  const rounded = Math.max(0, Math.round(grade * 10) / 10);

  let label: string;
  if (rounded <= 5) label = "Very Easy";
  else if (rounded <= 8) label = "Easy";
  else if (rounded <= 12) label = "Standard";
  else if (rounded <= 16) label = "Advanced";
  else label = "Complex";

  return { grade: rounded, label };
}

const ReadabilityScore = ({ text }: ReadabilityScoreProps) => {
  if (!text.trim()) return null;
  const { grade, label } = fleschKincaid(text);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <BookOpen className="h-3 w-3" />
      <span>Grade {grade}</span>
      <span className="text-muted-foreground/50">·</span>
      <span className="text-muted-foreground/70">{label}</span>
    </div>
  );
};

export default ReadabilityScore;
