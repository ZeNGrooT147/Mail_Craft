CREATE TABLE public.user_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phrase text NOT NULL,
  frequency int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phrases" ON public.user_phrases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own phrases" ON public.user_phrases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phrases" ON public.user_phrases FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own phrases" ON public.user_phrases FOR DELETE TO authenticated USING (auth.uid() = user_id);