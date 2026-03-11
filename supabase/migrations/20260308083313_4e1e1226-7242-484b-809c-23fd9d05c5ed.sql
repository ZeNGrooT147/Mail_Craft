
-- Email events for analytics tracking
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- draft_created, draft_refined, sent_gmail, sent_outlook, draft_deleted
  draft_id uuid REFERENCES public.email_drafts(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON public.email_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.email_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Email threads for grouping conversations
CREATE TABLE public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'New Thread',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads" ON public.email_threads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own threads" ON public.email_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads" ON public.email_threads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own threads" ON public.email_threads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Thread messages (individual emails in a thread)
CREATE TABLE public.thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'sent', -- 'sent' or 'received'
  subject text DEFAULT '',
  body text NOT NULL,
  sender text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thread messages" ON public.thread_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own thread messages" ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own thread messages" ON public.thread_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Draft reminders for scheduling
CREATE TABLE public.draft_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  draft_id uuid REFERENCES public.email_drafts(id) ON DELETE CASCADE,
  remind_at timestamp with time zone NOT NULL,
  title text NOT NULL DEFAULT 'Send email reminder',
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.draft_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders" ON public.draft_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reminders" ON public.draft_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reminders" ON public.draft_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminders" ON public.draft_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);
