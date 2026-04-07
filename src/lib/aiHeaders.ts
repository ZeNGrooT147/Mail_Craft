import { supabase } from "@/integrations/supabase/client";

export const getAiHeaders = async (): Promise<Record<string, string>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
};
