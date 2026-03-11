-- Create a table for saved email drafts
CREATE TABLE public.email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  context TEXT DEFAULT '',
  tone TEXT DEFAULT 'Professional',
  language TEXT DEFAULT 'en',
  draft_body TEXT NOT NULL,
  mode TEXT DEFAULT 'compose',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view their own drafts"
  ON public.email_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
  ON public.email_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON public.email_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON public.email_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON public.email_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster user queries
CREATE INDEX idx_email_drafts_user_id ON public.email_drafts(user_id);
CREATE INDEX idx_email_drafts_created_at ON public.email_drafts(created_at DESC);