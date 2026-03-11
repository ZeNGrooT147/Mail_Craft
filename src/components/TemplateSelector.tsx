import { useState } from "react";
import { Reply, UserPlus, Heart, Megaphone, HandshakeIcon, CalendarCheck, Briefcase, LifeBuoy, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  subject: string;
  context: string;
}

export const templates: EmailTemplate[] = [
  { id: "follow-up", name: "Follow-up", icon: Reply, subject: "Following up on our conversation", context: "Write a polite follow-up email referencing a previous meeting or conversation. Ask about next steps and express continued interest." },
  { id: "introduction", name: "Introduction", icon: UserPlus, subject: "Introduction", context: "Write a professional self-introduction email. Briefly explain who you are, your role, and the purpose of reaching out." },
  { id: "thank-you", name: "Thank You", icon: Heart, subject: "Thank you", context: "Write a sincere thank you email expressing gratitude. Be specific about what you're thankful for and mention any next steps." },
  { id: "cold-outreach", name: "Cold Outreach", icon: Megaphone, subject: "Quick question", context: "Write a compelling cold outreach email. Be concise, show you've done research, provide clear value proposition, and include a specific call to action." },
  { id: "apology", name: "Apology", icon: HandshakeIcon, subject: "My sincere apologies", context: "Write a professional apology email. Acknowledge the mistake, take responsibility, explain what happened briefly, and outline steps to prevent it from happening again." },
  { id: "meeting-request", name: "Meeting", icon: CalendarCheck, subject: "Meeting request", context: "Write a professional email requesting a meeting. Suggest a few time slots, explain the purpose briefly, and keep it concise." },
  { id: "job-application", name: "Job App", icon: Briefcase, subject: "Application for [Position]", context: "Write a compelling job application cover email. Highlight relevant experience, show enthusiasm for the role, and mention you've attached your resume." },
  { id: "support-ticket", name: "Support", icon: LifeBuoy, subject: "Support request", context: "Write a clear support request email. Describe the issue, steps to reproduce, expected vs actual behavior, and any urgency level." },
  { id: "escalation", name: "Escalation", icon: AlertTriangle, subject: "Escalation: Urgent attention needed", context: "Write a professional escalation email. Clearly state the issue, previous attempts to resolve, impact, and request immediate attention." },
  { id: "leave-application", name: "Leave", icon: CalendarCheck, subject: "Leave application", context: "Write a professional leave application email. Mention the type of leave (sick, vacation, personal), dates, and any handover arrangements." },
  { id: "complaint", name: "Complaint", icon: AlertTriangle, subject: "Formal complaint", context: "Write a professional complaint email. Clearly describe the issue, when it occurred, the impact, and what resolution you expect. Be firm but polite." },
  { id: "negotiation", name: "Negotiation", icon: HandshakeIcon, subject: "Regarding our discussion", context: "Write a professional negotiation email. Present your position clearly, provide supporting rationale, and propose specific terms while keeping the tone collaborative." },
];

interface TemplateSelectorProps {
  onSelect: (template: EmailTemplate) => void;
  activeId?: string;
}

const VISIBLE_COUNT = 6;

const TemplateSelector = ({ onSelect, activeId }: TemplateSelectorProps) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? templates : templates.slice(0, VISIBLE_COUNT);

  return (
    <div className="space-y-2.5">
      <span className="text-xs font-semibold text-muted-foreground">Templates</span>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((template) => {
          const Icon = template.icon;
          const isActive = activeId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 border truncate",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{template.name}</span>
            </button>
          );
        })}
      </div>
      {templates.length > VISIBLE_COUNT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Show less" : `+${templates.length - VISIBLE_COUNT} more`}
        </button>
      )}
    </div>
  );
};

export default TemplateSelector;
