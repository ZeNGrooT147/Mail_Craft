# MailCraft Easy README (For Teammate)

## Goal
Let users send emails from MailCraft directly through Gmail without opening Gmail compose.

## Current vs Target
- Current: Gmail button opens Gmail compose in a new tab.
- Target: Gmail button sends email directly using Gmail API.

## Simple Architecture Rule
Use this pattern for both Gemini and Gmail:
- Frontend -> Supabase Edge Function -> External API -> Frontend response

Meaning:
- Frontend should never hold provider secrets.
- Backend Edge Function should call Gemini/Gmail.

## Where to work in this project
- Main app routing/providers: src/App.tsx
- User session/auth state: src/contexts/AuthContext.tsx
- Compose UI and Gmail button: src/components/EmailComposer.tsx
- Supabase browser client: src/integrations/supabase/client.ts
- Existing AI backend example: supabase/functions/draft-email/index.ts
- DB schema migrations: supabase/migrations

## Gemini Flow (easy)
1. Frontend sends `messages + mode` to `/functions/v1/draft-email`.
2. Edge function reads `GEMINI_API_KEY` on server.
3. Edge function calls Gemini stream endpoint.
4. Edge function streams response chunks back to frontend.
5. Frontend shows live generated text.

Why this matters:
Use the exact same style for Gmail integration.

## Gmail Implementation Tasks
1. Configure Google Cloud project and enable Gmail API.
2. Create Google OAuth app.
3. Request scope: https://www.googleapis.com/auth/gmail.send
4. Connect OAuth to current Supabase user.
5. Store access/refresh tokens securely on backend.
6. Create backend send endpoint to call Gmail API.
7. Wire Gmail button in UI to backend endpoint.

## Suggested New Edge Functions
- gmail-oauth-start
- gmail-oauth-callback
- gmail-send

## Suggested Gmail Send Request
```json
{
  "to": "recipient@example.com",
  "subject": "Project update",
  "body": "Hi team,\n\nHere is the update...\n\nBest"
}
```

## Expected Gmail Send Response
```json
{
  "ok": true,
  "messageId": "...",
  "threadId": "..."
}
```

## Error Handling (must-have)
- invalid token / expired auth -> ask user to reconnect Gmail
- missing permission -> show "gmail.send permission required"
- rate limit -> ask user to retry
- provider temporary failure -> show generic retry message

## Security Rules
- Never put Google secrets in frontend.
- Never store refresh token in localStorage.
- Validate Supabase user in every Gmail edge function.
- Keep tokens server-side only.

## Teammate Setup (No secret sharing)
You do NOT need the original developer's auth.

Teammate should create her own:
- Google OAuth credentials
- Supabase function secrets
- Gmail test account connection

Share only:
- Code
- Migration files
- Env variable names (not values)

Never share:
- GOOGLE_CLIENT_SECRET
- Supabase service role key
- Access/refresh tokens
- Local .env values

## Acceptance Criteria
- User connects Gmail once via OAuth.
- Email sends directly from MailCraft.
- Clear errors shown when permission/auth is missing.
