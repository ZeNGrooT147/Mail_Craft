CREATE TABLE public.snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snippets" ON public.snippets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snippets" ON public.snippets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own snippets" ON public.snippets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own snippets" ON public.snippets FOR DELETE TO authenticated USING (auth.uid() = user_id);