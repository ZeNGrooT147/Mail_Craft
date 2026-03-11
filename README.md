# MailCraft — AI Email Assistant

An AI-powered email composition assistant built with React, TypeScript, and Supabase.

## Features

- AI-powered email draft generation with multiple tones and templates
- A/B draft comparison and AI Writing Coach
- Tone analysis, compliance checking, and readability scoring
- Email thread management and signature builder
- Analytics dashboard with productivity streaks
- Dark/light mode support

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **AI**: Google Gemini for email generation and analysis
- **State Management**: TanStack React Query

## Getting Started

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
src/
├── components/     # UI components (EmailComposer, CollapsibleSection, etc.)
├── contexts/       # React contexts (AuthContext)
├── hooks/          # Custom hooks (useProfile, useEmailEvents)
├── integrations/   # Backend integrations
├── pages/          # Route pages (Index, Auth, Profile)
└── lib/            # Utility functions
supabase/
├── functions/      # Edge functions (draft-email)
└── config.toml     # Backend configuration
```
