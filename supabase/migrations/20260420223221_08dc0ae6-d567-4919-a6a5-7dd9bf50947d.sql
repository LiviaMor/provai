CREATE TABLE public.body_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Avaliação corporal',
  source TEXT NOT NULL DEFAULT 'photo',
  gender TEXT,
  objective TEXT,
  product_url TEXT,
  confidence INTEGER NOT NULL DEFAULT 0,
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  size_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  style_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  fitness_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.body_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own body assessments"
ON public.body_assessments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body assessments"
ON public.body_assessments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body assessments"
ON public.body_assessments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body assessments"
ON public.body_assessments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_body_assessments_user_created ON public.body_assessments(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_body_assessments_updated_at
BEFORE UPDATE ON public.body_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();