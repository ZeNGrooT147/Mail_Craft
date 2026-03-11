import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Copy, ArrowRight, FileText, Mail, Handshake, Users, Megaphone, Heart, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Template {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  preview: string;
  body: string;
}

const templates: Template[] = [
  {
    id: "follow-up", title: "Follow-Up", category: "Sales", icon: Clock,
    color: "text-primary", bg: "bg-primary/10",
    preview: "Professional follow-up after meeting or conversation",
    body: `Hi [Name],\n\nThank you for taking the time to speak with me [today/yesterday]. I really enjoyed our conversation about [topic].\n\nAs discussed, I'd love to [next step]. I've attached [relevant materials] for your review.\n\nPlease let me know if you have any questions or if there's anything else I can help with.\n\nBest regards,\n[Your Name]`,
  },
  {
    id: "intro", title: "Introduction", category: "Networking", icon: Users,
    color: "text-info", bg: "bg-info/10",
    preview: "Introduce yourself or connect two people",
    body: `Hi [Name],\n\nI hope this message finds you well. My name is [Your Name], and I'm [your role] at [Company].\n\nI'm reaching out because [reason for introduction]. I believe we could [mutual benefit].\n\nI'd love to schedule a quick call to discuss this further. Would [day/time] work for you?\n\nLooking forward to hearing from you.\n\nBest,\n[Your Name]`,
  },
  {
    id: "thank-you", title: "Thank You", category: "Relationship", icon: Heart,
    color: "text-destructive", bg: "bg-destructive/10",
    preview: "Express gratitude after help or an opportunity",
    body: `Dear [Name],\n\nI wanted to take a moment to express my sincere gratitude for [specific thing]. Your [help/support/guidance] meant a great deal to me.\n\n[Specific impact or result of their help].\n\nThank you again for your generosity and time. I truly appreciate it.\n\nWarmly,\n[Your Name]`,
  },
  {
    id: "cold-outreach", title: "Cold Outreach", category: "Sales", icon: Megaphone,
    color: "text-success", bg: "bg-success/10",
    preview: "First contact with a potential prospect or partner",
    body: `Hi [Name],\n\nI noticed [specific observation about their company/work] and thought you might be interested in [your value proposition].\n\nWe've helped companies like [similar company] achieve [specific result]. I think we could do something similar for [their company].\n\nWould you be open to a 15-minute call this week to explore this?\n\nCheers,\n[Your Name]`,
  },
  {
    id: "apology", title: "Apology", category: "Relationship", icon: AlertTriangle,
    color: "text-primary", bg: "bg-primary/10",
    preview: "Professional apology for a mistake or delay",
    body: `Dear [Name],\n\nI sincerely apologize for [specific issue]. I understand this may have caused [impact], and I take full responsibility.\n\nTo make this right, I've [corrective action taken]. Going forward, I will [preventive measures] to ensure this doesn't happen again.\n\nThank you for your understanding and patience.\n\nSincerely,\n[Your Name]`,
  },
  {
    id: "meeting-request", title: "Meeting Request", category: "Business", icon: Handshake,
    color: "text-info", bg: "bg-info/10",
    preview: "Request a meeting with clear agenda",
    body: `Hi [Name],\n\nI'd like to schedule a meeting to discuss [topic/purpose]. Here's a brief agenda:\n\n1. [Agenda item 1]\n2. [Agenda item 2]\n3. [Agenda item 3]\n\nWould [date/time option 1] or [date/time option 2] work for your schedule? The meeting should take approximately [duration].\n\nPlease let me know what works best.\n\nBest regards,\n[Your Name]`,
  },
  {
    id: "project-update", title: "Project Update", category: "Business", icon: FileText,
    color: "text-success", bg: "bg-success/10",
    preview: "Share project progress with stakeholders",
    body: `Hi Team,\n\nHere's a quick update on [project name]:\n\n**Completed:**\n- [Accomplishment 1]\n- [Accomplishment 2]\n\n**In Progress:**\n- [Current task 1]\n- [Current task 2]\n\n**Next Steps:**\n- [Upcoming milestone]\n\n**Blockers:** [Any issues or none]\n\nLet me know if you have questions.\n\nBest,\n[Your Name]`,
  },
  {
    id: "referral-request", title: "Referral Request", category: "Networking", icon: Mail,
    color: "text-destructive", bg: "bg-destructive/10",
    preview: "Ask for a professional referral or recommendation",
    body: `Hi [Name],\n\nI hope you're doing well! I'm currently [looking for new opportunities / expanding my network in X field].\n\nGiven our positive working relationship at [context], I was wondering if you might know anyone who [specific need]. A warm introduction would mean a lot.\n\nOf course, I'm happy to reciprocate in any way I can.\n\nThank you for considering this!\n\nBest,\n[Your Name]`,
  },
];

const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];

interface TemplatesGalleryProps {
  onUseTemplate?: (body: string) => void;
}

const TemplatesGallery = ({ onUseTemplate }: TemplatesGalleryProps) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = templates.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.preview.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "All" || t.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopy = (body: string) => {
    navigator.clipboard.writeText(body);
    toast.success("Template copied to clipboard");
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((template, i) => {
          const Icon = template.icon;
          const isExpanded = expanded === template.id;
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border bg-card p-4 cursor-pointer transition-all duration-300 ${
                isExpanded ? "border-primary/30 shadow-lg" : "border-border hover:border-primary/20 hover:shadow-md"
              }`}
              onClick={() => setExpanded(isExpanded ? null : template.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl ${template.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${template.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-bold text-foreground">{template.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">{template.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{template.preview}</p>
                </div>
              </div>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-border"
                >
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-body leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                    {template.body}
                  </pre>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-lg" onClick={(e) => { e.stopPropagation(); handleCopy(template.body); }}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                    {onUseTemplate && (
                      <Button size="sm" className="h-8 text-xs gap-1.5 rounded-lg shadow-sm shadow-primary/20" onClick={(e) => { e.stopPropagation(); onUseTemplate(template.body); toast.success("Template loaded into composer"); }}>
                        <ArrowRight className="h-3 w-3" /> Use in Composer
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No templates found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default TemplatesGallery;
