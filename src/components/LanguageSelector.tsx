import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "pt", label: "Portuguese", flag: "🇧🇷" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

interface LanguageSelectorProps {
  selected: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
}

const LanguageSelector = ({ selected, onSelect }: LanguageSelectorProps) => {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">Language</span>
      <div className="flex gap-1.5 flex-wrap">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
              selected === lang.code
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
            title={lang.label}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
export { languages };
