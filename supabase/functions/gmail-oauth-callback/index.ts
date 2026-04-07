// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

const fromBase64Url = (input: string) => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return decoder.decode(bytes);
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

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const APP_URL =
    Deno.env.get("APP_URL") || Deno.env.get("VITE_APP_URL") || Deno.env.get("SITE_URL") || "http://localhost:5173";
  const defaultAppUrl = resolveReturnTo(APP_URL) || "http://localhost:5173";
  const redirectToApp = (path: string, appUrl?: string) => Response.redirect(`${appUrl || defaultAppUrl}${path}`, 302);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      return redirectToApp(`/?gmail_error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return redirectToApp("/?gmail_error=missing_code_or_state");
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
    const OAUTH_STATE_SECRET = Deno.env.get("GMAIL_OAUTH_STATE_SECRET") || GOOGLE_CLIENT_SECRET;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error("Google OAuth env is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase service env is not configured");
    }
    if (!OAUTH_STATE_SECRET) {
      throw new Error("Missing state secret");
    }

    const [stateData, stateSig] = state.split(".");
    if (!stateData || !stateSig) {
      return redirectToApp("/?gmail_error=invalid_state");
    }

    const expectedSig = await signState(stateData, OAUTH_STATE_SECRET);
    if (expectedSig !== stateSig) {
      return redirectToApp("/?gmail_error=invalid_state_signature");
    }

    let statePayload: { u: string; t: number; n: string; r?: string; p?: string };
    try {
      statePayload = JSON.parse(fromBase64Url(stateData));
    } catch {
      return redirectToApp("/?gmail_error=invalid_state_payload");
    }

    const ageMs = Date.now() - Number(statePayload.t || 0);
    if (!statePayload.u || Number.isNaN(ageMs) || ageMs > 15 * 60 * 1000) {
      return redirectToApp("/?gmail_error=expired_state");
    }

    const returnTo = resolveReturnTo(statePayload.r) || defaultAppUrl;
    const returnPath = typeof statePayload.p === "string" && statePayload.p.startsWith("/") && !statePayload.p.startsWith("//")
      ? statePayload.p
      : "/";

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      return redirectToApp(`${returnPath}?gmail_error=${encodeURIComponent(tokenData.error || "token_exchange_failed")}`, returnTo);
    }

    const userInfoResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = userInfoResp.ok ? await userInfoResp.json() : {};

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
      : null;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upsertError } = await supabaseAdmin.from("gmail_connections").upsert(
      {
        user_id: statePayload.u,
        google_email: userInfo.email || null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || null,
        scope: tokenData.scope || null,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      throw upsertError;
    }

    return redirectToApp(`${returnPath}?gmail=connected`, returnTo);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "callback_failed";
    return redirectToApp(`/?gmail_error=${encodeURIComponent(reason)}`);
  }
});
