import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Link2, AlertTriangle } from "lucide-react";

interface LinkDetectorProps {
  text: string;
}

const suspiciousPatterns = [/bit\.ly/i, /tinyurl/i, /goo\.gl/i, /t\.co/i, /short\.to/i];

const LinkDetector = ({ text }: LinkDetectorProps) => {
  const links = useMemo(() => {
    const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
    const matches = text.match(urlRegex) || [];
    return matches.map(url => ({
      url,
      suspicious: suspiciousPatterns.some(p => p.test(url)),
    }));
  }, [text]);

  if (links.length === 0) return null;

  const hasSuspicious = links.some(l => l.suspicious);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="text-[10px] gap-1">
        <Link2 className="h-3 w-3" />
        {links.length} link{links.length > 1 ? "s" : ""} detected
      </Badge>
      {hasSuspicious && (
        <Badge variant="outline" className="text-[10px] gap-1 bg-orange-500/10 text-orange-600 border-orange-500/30">
          <AlertTriangle className="h-3 w-3" />
          Shortened URL detected
        </Badge>
      )}
    </div>
  );
};

export default LinkDetector;
