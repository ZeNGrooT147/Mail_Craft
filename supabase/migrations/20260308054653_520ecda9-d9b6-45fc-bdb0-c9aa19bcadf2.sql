
CREATE TABLE public.email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Signature',
  full_name text NOT NULL DEFAULT '',
  job_title text DEFAULT '',
  company text DEFAULT '',
  phone text DEFAULT '',
  website text DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signatures" ON public.email_signatures FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own signatures" ON public.email_signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own signatures" ON public.email_signatures FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own signatures" ON public.email_signatures FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_email_signatures_updated_at BEFORE UPDATE ON public.email_signatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
