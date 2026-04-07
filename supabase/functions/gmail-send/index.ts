// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

const toBase64Url = (input: Uint8Array) => {
  let binary = "";
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const refreshAccessToken = async (refreshToken: string) => {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth env is not configured");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = await resp.json();
  if (!resp.ok || !payload.access_token) {
    const code = payload?.error || "refresh_failed";
    const error = new Error(code);
    (error as any).oauthError = code;
    throw error;
  }

  return {
    accessToken: payload.access_token as string,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString()
      : null,
    scope: payload.scope || null,
    tokenType: payload.token_type || null,
  };
};

const needsRefresh = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) <= Date.now() + 30_000;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Use POST" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env is not configured");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Please sign in" }, 401);
    }

    const payload = await req.json();
    const to = String(payload?.to || "").trim();
    const subject = String(payload?.subject || "").trim();
    const body = String(payload?.body || "").trim();
    const cc = String(payload?.cc || "").trim();
    const bcc = String(payload?.bcc || "").trim();
    const replyTo = String(payload?.replyTo || "").trim();
    const threadId = String(payload?.threadId || "").trim();

    if (!to) return jsonResponse({ ok: false, code: "VALIDATION_ERROR", message: "Recipient is required" }, 400);
    if (!body) return jsonResponse({ ok: false, code: "VALIDATION_ERROR", message: "Body is required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: conn, error: connError } = await admin
      .from("gmail_connections")
      .select("user_id, access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connError) throw connError;
    if (!conn) {
      return jsonResponse(
        {
          ok: false,
          code: "GMAIL_NOT_CONNECTED",
          message: "Gmail is not connected. Please connect Gmail first.",
        },
        404
      );
    }

    let accessToken = conn.access_token;
    if (!accessToken) {
      return jsonResponse(
        {
          ok: false,
          code: "GMAIL_RECONNECT_REQUIRED",
          message: "Gmail authorization is missing. Please reconnect Gmail.",
        },
        401
      );
    }

    if (needsRefresh(conn.expires_at)) {
      if (!conn.refresh_token) {
        return jsonResponse(
          {
            ok: false,
            code: "GMAIL_RECONNECT_REQUIRED",
            message: "Gmail token expired and no refresh token found. Please reconnect Gmail.",
          },
          401
        );
      }

      try {
        const refreshed = await refreshAccessToken(conn.refresh_token);
        accessToken = refreshed.accessToken;

        const { error: updateError } = await admin
          .from("gmail_connections")
          .update({
            access_token: refreshed.accessToken,
            expires_at: refreshed.expiresAt,
            scope: refreshed.scope,
            token_type: refreshed.tokenType,
          })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } catch (refreshErr) {
        return jsonResponse(
          {
            ok: false,
            code: "GMAIL_RECONNECT_REQUIRED",
            message: "Gmail authorization expired. Please reconnect your Gmail account.",
            detail: refreshErr instanceof Error ? refreshErr.message : "refresh_failed",
          },
          401
        );
      }
    }

    const headers: string[] = [`To: ${to}`];
    if (cc) headers.push(`Cc: ${cc}`);
    if (bcc) headers.push(`Bcc: ${bcc}`);
    if (replyTo) headers.push(`Reply-To: ${replyTo}`);
    headers.push(`Subject: ${subject || "(No subject)"}`);
    headers.push("MIME-Version: 1.0");
    headers.push("Content-Type: text/plain; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: 8bit");

    const mime = `${headers.join("\r\n")}\r\n\r\n${body}`;
    const raw = toBase64Url(encoder.encode(mime));

    const gmailResp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
    });

    const gmailData = await gmailResp.json().catch(() => ({}));

    if (!gmailResp.ok) {
      const status = gmailResp.status;
      const reason = gmailData?.error?.errors?.[0]?.reason || gmailData?.error?.status || "gmail_send_failed";

      if (status === 401 || reason === "invalid_grant") {
        return jsonResponse(
          {
            ok: false,
            code: "GMAIL_RECONNECT_REQUIRED",
            message: "Gmail authorization expired. Please reconnect your Gmail account.",
          },
          401
        );
      }

      if (status === 403) {
        return jsonResponse(
          {
            ok: false,
            code: "GMAIL_PERMISSION_MISSING",
            message: "Missing Gmail permission. Please grant gmail.send access.",
          },
          403
        );
      }

      if (status === 429) {
        return jsonResponse(
          {
            ok: false,
            code: "GMAIL_RATE_LIMITED",
            message: "Gmail rate limit reached. Please retry shortly.",
          },
          429
        );
      }

      return jsonResponse(
        {
          ok: false,
          code: "GMAIL_SEND_FAILED",
          message: "Failed to send via Gmail.",
          detail: reason,
        },
        status >= 500 ? 502 : status
      );
    }

    return jsonResponse({
      ok: true,
      messageId: gmailData.id,
      threadId: gmailData.threadId,
      labelIds: gmailData.labelIds || [],
    });
  } catch (e) {
    return jsonResponse(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: e instanceof Error ? e.message : "Unknown error",
      },
      500
    );
  }
});
