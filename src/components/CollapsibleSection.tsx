import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  className?: string;
  /** For accordion behavior: unique id for this section */
  sectionId?: string;
  /** For accordion behavior: currently open section id */
  openSectionId?: string | null;
  /** For accordion behavior: callback when this section is toggled */
  onToggle?: (sectionId: string | null) => void;
}

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false, badge, className, sectionId, openSectionId, onToggle }: CollapsibleSectionProps) => {
  // If accordion-controlled, use external state; otherwise use local state
  const isAccordion = sectionId !== undefined && onToggle !== undefined;
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  
  const open = isAccordion ? openSectionId === sectionId : localOpen;

  const handleToggle = () => {
    if (isAccordion) {
      onToggle(open ? null : sectionId);
    } else {
      setLocalOpen(!localOpen);
    }
  };

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden bg-card/50", className)}>
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-2.5 w-2.5 text-primary" />
          </div>
          <span className="text-[10px] font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 pt-0.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsibleSection;
