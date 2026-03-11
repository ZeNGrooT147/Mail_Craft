// Cloud authentication integration module

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
};

export const auth = {
  signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: opts?.redirect_uri ?? window.location.origin,
      },
    });

    if (error) {
      return { error };
    }

    return { data };
  },
};
