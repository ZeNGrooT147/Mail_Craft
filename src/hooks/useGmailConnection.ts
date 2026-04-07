import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type GmailConnection = {
  google_email: string | null;
  expires_at: string | null;
};

export const useGmailConnection = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("gmail_connections")
      .select("google_email, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setConnection(null);
    } else {
      setConnection(data ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refetchConnection();
  }, [refetchConnection]);

  const startOAuth = useCallback(
    async (returnTo?: string) => {
      if (!user) throw new Error("Please sign in first.");

      const resolvedReturnPath = (() => {
        const fallback = `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
        if (!returnTo) return fallback;
        try {
          const parsed = new URL(returnTo, window.location.origin);
          const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          return path || fallback;
        } catch {
          return returnTo.startsWith("/") ? returnTo : fallback;
        }
      })();

      setConnecting(true);
      try {
        const { data, error } = await supabase.functions.invoke("gmail-oauth-start", {
          body: { returnTo: returnTo ?? window.location.origin, returnPath: resolvedReturnPath },
        });

        if (error || !data?.authUrl) {
          throw new Error(error?.message || data?.error || "Failed to start Gmail connect.");
        }

        window.location.href = data.authUrl;
      } finally {
        setConnecting(false);
      }
    },
    [user]
  );

  const disconnect = useCallback(async () => {
    if (!user) throw new Error("Please sign in first.");

    setDisconnecting(true);
    try {
      const { error } = await supabase.from("gmail_connections").delete().eq("user_id", user.id);
      if (error) throw error;
      setConnection(null);
    } finally {
      setDisconnecting(false);
    }
  }, [user]);

  return {
    connection,
    isConnected: !!connection,
    email: connection?.google_email ?? null,
    expiresAt: connection?.expires_at ?? null,
    loading,
    connecting,
    disconnecting,
    refetchConnection,
    startOAuth,
    disconnect,
  };
};
