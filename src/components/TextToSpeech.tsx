import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech = ({ text }: TextToSpeechProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggle = () => {
    if (!window.speechSynthesis) { toast.error("Text-to-speech not supported."); return; }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!text.trim()) { toast.error("No text to read."); return; }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={!text.trim()}
      className="h-8 sm:h-9 px-2 sm:px-3.5 text-xs sm:text-sm gap-1 sm:gap-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors font-medium shrink-0"
      title={isSpeaking ? "Stop reading" : "Read aloud"}
    >
      {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isSpeaking ? "Stop" : "Listen"}</span>
    </Button>
  );
};

export default TextToSpeech;
