import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, Plus, Trash2, Check, X,
  User, Briefcase, Building2, Phone, Globe, Star,
} from "lucide-react";
import { toast } from "sonner";

interface Signature {
  id: string;
  name: string;
  full_name: string;
  job_title: string;
  company: string;
  phone: string;
  website: string;
  is_default: boolean;
}

interface SignatureBuilderProps {
  onSignatureChange?: (signature: string | null) => void;
}

const SignatureBuilder = ({ onSignatureChange }: SignatureBuilderProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [editing, setEditing] = useState<Signature | null>(null);
  const [isNew, setIsNew] = useState(false);

  const formatSignature = useCallback((sig: Signature): string => {
    const parts: string[] = [];
    if (sig.full_name) parts.push(`**${sig.full_name}**`);
    if (sig.job_title && sig.company) parts.push(`${sig.job_title} · ${sig.company}`);
    else if (sig.job_title) parts.push(sig.job_title);
    else if (sig.company) parts.push(sig.company);
    if (sig.phone) parts.push(`📞 ${sig.phone}`);
    if (sig.website) parts.push(`🔗 ${sig.website}`);
    return parts.length ? "\n\n---\n" + parts.join("  \n") : "";
  }, []);

  const fetchSignatures = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_signatures")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (data) {
      setSignatures(data as Signature[]);
      const defaultSig = data.find((s: any) => s.is_default);
      onSignatureChange?.(defaultSig ? formatSignature(defaultSig as Signature) : null);
    }
  }, [user, onSignatureChange, formatSignature]);

  useEffect(() => { fetchSignatures(); }, [fetchSignatures]);

  const startNew = () => {
    setEditing({
      id: "",
      name: "My Signature",
      full_name: profile?.display_name || "",
      job_title: "",
      company: "",
      phone: "",
      website: "",
      is_default: signatures.length === 0,
    });
    setIsNew(true);
  };

  const save = async () => {
    if (!editing || !user) return;
    if (!editing.full_name.trim()) { toast.error("Full name is required."); return; }

    if (editing.is_default) {
      await supabase.from("email_signatures").update({ is_default: false }).eq("user_id", user.id);
    }

    if (isNew) {
      const { error } = await supabase.from("email_signatures").insert({
        user_id: user.id, name: editing.name, full_name: editing.full_name,
        job_title: editing.job_title, company: editing.company,
        phone: editing.phone, website: editing.website, is_default: editing.is_default,
      });
      if (error) { toast.error("Failed to save."); return; }
    } else {
      const { error } = await supabase.from("email_signatures").update({
        name: editing.name, full_name: editing.full_name,
        job_title: editing.job_title, company: editing.company,
        phone: editing.phone, website: editing.website, is_default: editing.is_default,
      }).eq("id", editing.id);
      if (error) { toast.error("Failed to update."); return; }
    }

    toast.success("Signature saved!");
    setEditing(null);
    setIsNew(false);
    fetchSignatures();
  };

  const deleteSig = async (id: string) => {
    await supabase.from("email_signatures").delete().eq("id", id);
    toast.success("Signature deleted.");
    fetchSignatures();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("email_signatures").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("email_signatures").update({ is_default: true }).eq("id", id);
    toast.success("Default signature updated.");
    fetchSignatures();
  };

  if (!user) return null;

  const field = (icon: React.ReactNode, label: string, value: string, key: keyof Signature) => (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setEditing((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
        placeholder={label}
        className="flex-1 bg-background rounded-xl border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Signature list */}
      {signatures.map((sig, i) => (
        <motion.div
          key={sig.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-md transition-all duration-200"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <PenLine className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{sig.full_name || sig.name}</span>
              {sig.is_default && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground font-semibold">
                  Default
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate block mt-0.5">
              {[sig.job_title, sig.company].filter(Boolean).join(" · ") || "No details added"}
            </span>
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!sig.is_default && (
              <Button variant="ghost" size="sm" onClick={() => setDefault(sig.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Set as default">
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setEditing(sig); setIsNew(false); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
              <PenLine className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteSig(sig.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      ))}

      {/* Empty state */}
      {signatures.length === 0 && !editing && (
        <div className="text-center py-10">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <PenLine className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">No signatures yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a signature to automatically append to your emails.</p>
        </div>
      )}

      {/* Editor */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-5 rounded-2xl border-2 border-primary/20 bg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {isNew ? "New Signature" : "Edit Signature"}
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setIsNew(false); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="Signature label (e.g. Work, Personal)"
                className="w-full bg-background rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
              />
              {field(<User className="h-4 w-4" />, "Full Name", editing.full_name, "full_name")}
              {field(<Briefcase className="h-4 w-4" />, "Job Title", editing.job_title, "job_title")}
              {field(<Building2 className="h-4 w-4" />, "Company", editing.company, "company")}
              {field(<Phone className="h-4 w-4" />, "Phone", editing.phone, "phone")}
              {field(<Globe className="h-4 w-4" />, "Website", editing.website, "website")}

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_default}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, is_default: e.target.checked } : prev)}
                  className="rounded border-input"
                />
                Set as default signature
              </label>

              {editing.full_name && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 font-semibold">Preview</p>
                  <p className="font-medium text-foreground text-sm">{editing.full_name}</p>
                  {(editing.job_title || editing.company) && (
                    <p>{[editing.job_title, editing.company].filter(Boolean).join(" · ")}</p>
                  )}
                  {editing.phone && <p>📞 {editing.phone}</p>}
                  {editing.website && <p>🔗 {editing.website}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={save} className="h-8 px-4 text-xs gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setIsNew(false); }} className="h-8 px-4 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New signature button */}
      {!editing && (
        <Button
          variant="outline"
          size="sm"
          onClick={startNew}
          className="w-full h-10 text-xs gap-1.5 border-dashed rounded-2xl"
        >
          <Plus className="h-3.5 w-3.5" />
          New Signature
        </Button>
      )}
    </div>
  );
};

export default SignatureBuilder;
