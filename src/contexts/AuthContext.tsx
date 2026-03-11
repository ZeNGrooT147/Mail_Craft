import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const SENSITIVE_AUTH_KEYS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "token_type",
  "expires_at",
  "expires_in",
  "code",
];

const hasSensitiveAuthParams = (params: URLSearchParams) =>
  SENSITIVE_AUTH_KEYS.some((key) => params.has(key));

const clearAuthParamsFromUrl = () => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  let changed = false;

  if (hasSensitiveAuthParams(url.searchParams)) {
    SENSITIVE_AUTH_KEYS.forEach((key) => url.searchParams.delete(key));
    changed = true;
  }

  if (url.hash.startsWith("#")) {
    const hashParams = new URLSearchParams(url.hash.slice(1));
    if (hasSensitiveAuthParams(hashParams)) {
      SENSITIVE_AUTH_KEYS.forEach((key) => hashParams.delete(key));
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : "";
      changed = true;
    }
  }

  if (changed) {
    window.history.replaceState({}, document.title, url.toString());
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Remove auth callback tokens from the URL after session is established.
        if (session) clearAuthParamsFromUrl();
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) clearAuthParamsFromUrl();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
