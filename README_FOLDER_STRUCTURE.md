# MailCraft Folder Structure Walkthrough

## Top-level folders
- src/
  - Frontend React app (pages, UI components, hooks, context, integrations)
- supabase/
  - Backend side for this app (Edge Functions, config, migrations)
- public/
  - Static assets served as-is

## Frontend structure (src)

### App bootstrap and global providers
- src/main.tsx
  - React root and theme provider.
- src/App.tsx
  - Query client provider, routing, AuthProvider wiring.

### Route pages
- src/pages/Index.tsx
  - Main authenticated workspace shell and panel switching.
- src/pages/Auth.tsx
  - Sign-in / sign-up page.
- src/pages/Profile.tsx
  - User profile page (good place to show Gmail connect status).
- src/pages/ResetPassword.tsx
  - Password reset flow.

### Core feature components
- src/components/EmailComposer.tsx
  - Main compose/reply UI.
  - Generates AI drafts.
  - Currently uses open-in-Gmail deeplink behavior.
  - This is the primary file to update for direct Gmail send button behavior.
- src/components/AIChatAssistant.tsx
  - Chat style AI assistant using same backend AI endpoint.
- src/components/*
  - Other AI tools (tone, grammar, summarize, quick replies, etc.) that call same edge function with different modes.

### Auth and data integration
- src/contexts/AuthContext.tsx
  - Supabase session and user management for the frontend.
- src/integrations/supabase/client.ts
  - Supabase browser client initialization.
- src/hooks/*
  - Reusable app logic for profile/events/mobile utilities.

## Backend structure (supabase)

### Edge functions
- supabase/functions/draft-email/index.ts
  - Existing Gemini proxy function.
  - Receives mode plus messages and streams AI response.
  - Reused by many frontend components.

Recommended new edge functions for Gmail:
- supabase/functions/gmail-oauth-start/index.ts
- supabase/functions/gmail-oauth-callback/index.ts
- supabase/functions/gmail-send/index.ts

### Database migrations
- supabase/migrations/*.sql
  - SQL schema history.
  - Add new migration for Gmail token storage table and RLS policies.

## How new Gmail logic should fit this structure
1. Keep frontend simple:
   - EmailComposer calls one backend endpoint for Gmail send.
2. Keep secrets on backend:
   - OAuth secret and refresh token never go to browser.
3. Keep user mapping via Supabase auth:
   - Use current signed-in Supabase user id to find that user Gmail connection.
4. Keep flow parallel to existing AI design:
   - Frontend calls edge function.
   - Edge function calls third-party API.
   - Frontend only receives safe response.

## Fast map for implementation
- UI changes:
  - src/components/EmailComposer.tsx
  - Optional status UI in src/pages/Profile.tsx
- Auth identity source:
  - src/contexts/AuthContext.tsx
- Backend functions:
  - supabase/functions/gmail-oauth-start/index.ts
  - supabase/functions/gmail-oauth-callback/index.ts
  - supabase/functions/gmail-send/index.ts
- DB migration:
  - supabase/migrations/<new_migration>.sql

If data is sensitive (tokens, client secrets), it belongs in edge functions and DB with RLS, not in src/components.
