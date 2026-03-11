import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SnippetsLibraryProps {
  onInsert: (body: string) => void;
}

interface Snippet {
  id: string;
  name: string;
  body: string;
}

const SnippetsLibrary = ({ onInsert }: SnippetsLibraryProps) => {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newBody, setNewBody] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchSnippets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("snippets")
      .select("id, name, body")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSnippets((data as Snippet[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSnippets(); }, [fetchSnippets]);

  const addSnippet = async () => {
    if (!user || !newName.trim() || !newBody.trim()) return;
    const { error } = await supabase.from("snippets").insert({
      user_id: user.id,
      name: newName.trim(),
      body: newBody.trim(),
    });
    if (error) { toast.error("Failed to save snippet."); return; }
    toast.success("Snippet saved!");
    setNewName("");
    setNewBody("");
    setAdding(false);
    fetchSnippets();
  };

  const deleteSnippet = async (id: string) => {
    await supabase.from("snippets").delete().eq("id", id);
    setSnippets((s) => s.filter((x) => x.id !== id));
    toast.success("Snippet deleted.");
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading snippets…</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Snippets</span>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="h-6 px-1.5 text-[10px]">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {adding && (
        <div className="space-y-1.5 border border-border rounded-lg p-2 bg-secondary/20">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Snippet name"
            className="w-full bg-background rounded-md px-2 py-1.5 text-xs border border-input outline-none focus:ring-2 focus:ring-ring/20"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Snippet text…"
            rows={2}
            className="w-full bg-background rounded-md px-2 py-1.5 text-xs border border-input outline-none resize-none focus:ring-2 focus:ring-ring/20"
          />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={addSnippet} disabled={!newName.trim() || !newBody.trim()} className="h-7 text-[11px]">Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="h-7 text-[11px]">Cancel</Button>
          </div>
        </div>
      )}

      {snippets.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground/60 py-1">No snippets yet. Click + to add one.</p>
      )}

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {snippets.map((s) => (
          <div key={s.id} className="flex items-start gap-1.5 group rounded-md border border-border bg-background p-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-medium text-foreground block truncate">{s.name}</span>
              <span className="text-[10px] text-muted-foreground line-clamp-2">{s.body}</span>
            </div>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" onClick={() => onInsert(s.body)} className="h-6 w-6 p-0">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteSnippet(s.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnippetsLibrary;
