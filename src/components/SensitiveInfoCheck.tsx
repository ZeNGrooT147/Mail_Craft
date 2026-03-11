import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

interface SensitiveInfoCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warnings: string[];
  onProceed: () => void;
}

const SensitiveInfoCheck = ({ open, onOpenChange, warnings, onProceed }: SensitiveInfoCheckProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Sensitive Information Detected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Your draft may contain sensitive information:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {warnings.map((w, i) => (
                  <li key={i} className="text-destructive">{w}</li>
                ))}
              </ul>
              <p>Are you sure you want to proceed?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go Back & Edit</AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>Proceed Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export function detectSensitiveInfo(text: string): string[] {
  const warnings: string[] = [];
  if (/\d{3}-\d{2}-\d{4}/.test(text)) warnings.push("Possible SSN detected");
  if (/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/.test(text)) warnings.push("Possible credit card number detected");
  if (/\bpassword\b/i.test(text)) warnings.push('Contains the word "password"');
  if (/\bconfidential\b/i.test(text)) warnings.push('Contains the word "confidential"');
  if (/\bsecret\b/i.test(text)) warnings.push('Contains the word "secret"');
  return warnings;
}

export function detectAttachmentIntent(text: string): boolean {
  return /\b(attach(ed|ment|ing)?|enclos(ed|ure|ing)|file|document)\b/i.test(text);
}

export default SensitiveInfoCheck;
