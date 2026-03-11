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
    <Button variant="ghost" size="sm" onClick={toggle} disabled={!text.trim()} className="h-7 px-2 text-[11px] gap-1" title={isSpeaking ? "Stop reading" : "Read aloud"}>
      {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
      {isSpeaking ? "Stop" : "Listen"}
    </Button>
  );
};

export default TextToSpeech;
