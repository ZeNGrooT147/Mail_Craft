// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

const resolveReturnTo = (value: string | undefined) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const origin = parsed.origin;
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isProd = origin === "https://mailcraft-hq.vercel.app";
    return isLocalhost || isProd ? origin : null;
  } catch {
    return null;
  }
};

const toBase64Url = (input: Uint8Array | string) => {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const signState = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
    const GOOGLE_OAUTH_SCOPES =
      Deno.env.get("GOOGLE_OAUTH_SCOPES") || "https://www.googleapis.com/auth/gmail.send";
    const OAUTH_STATE_SECRET =
      Deno.env.get("GMAIL_OAUTH_STATE_SECRET") || Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env is not configured");
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) throw new Error("Google OAuth env is not configured");
    if (!OAUTH_STATE_SECRET) throw new Error("Missing GMAIL_OAUTH_STATE_SECRET or GOOGLE_CLIENT_SECRET");

    let body: { returnTo?: string; returnPath?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const defaultReturnTo =
      Deno.env.get("APP_URL") || Deno.env.get("VITE_APP_URL") || Deno.env.get("SITE_URL") || "http://localhost:5173";
    const returnTo = resolveReturnTo(body.returnTo) || resolveReturnTo(defaultReturnTo) || "http://localhost:5173";
    const returnPath = (() => {
      const value = body.returnPath;
      if (!value) return "/";
      return value.startsWith("/") && !value.startsWith("//") ? value : "/";
    })();

    const statePayload = JSON.stringify({
      u: user.id,
      t: Date.now(),
      n: crypto.randomUUID(),
      r: returnTo,
      p: returnPath,
    });
    const stateData = toBase64Url(statePayload);
    const stateSig = await signState(stateData, OAUTH_STATE_SECRET);
    const state = `${stateData}.${stateSig}`;

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_OAUTH_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);

    return new Response(JSON.stringify({ authUrl: url.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
