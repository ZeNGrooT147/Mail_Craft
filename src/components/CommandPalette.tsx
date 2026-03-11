import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Sparkles, FileText, PenLine, User, LogOut, Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchTab: (tab: "compose" | "drafts" | "signatures") => void;
  onLoadDraft: (draft: Tables<"email_drafts">) => void;
}

const CommandPalette = ({ open, onOpenChange, onSwitchTab, onLoadDraft }: CommandPaletteProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Tables<"email_drafts">[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("email_drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setDrafts(data ?? []));
  }, [open, user]);

  const run = useCallback((fn: () => void) => {
    fn();
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search drafts…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => onSwitchTab("compose"))}>
            <Sparkles className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>Compose new email</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onSwitchTab("drafts"))}>
            <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>View drafts</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onSwitchTab("signatures"))}>
            <PenLine className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>Manage signatures</span>
          </CommandItem>
        </CommandGroup>

        {drafts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Drafts">
              {drafts.map((d) => (
                <CommandItem key={d.id} onSelect={() => run(() => onLoadDraft(d))}>
                  <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{d.subject || "Untitled draft"}</span>
                  {d.tone && (
                    <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {d.tone}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => run(() => navigate("/profile"))}>
            <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>Profile settings</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => signOut())}>
            <LogOut className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
