import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id })
        .select("*")
        .single();

      if (insertError) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(created as Profile);
      setLoading(false);
      return;
    }

    setProfile(data as Profile | null);
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [user?.id]);

  return { profile, loading, refetch: fetchProfile };
}
