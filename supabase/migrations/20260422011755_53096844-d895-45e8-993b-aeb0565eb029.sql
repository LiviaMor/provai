
-- color_analyses
CREATE TABLE public.color_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Análise de coloração',
  season TEXT,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_photo TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.color_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own color analyses" ON public.color_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own color analyses" ON public.color_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own color analyses" ON public.color_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own color analyses" ON public.color_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_color_analyses_updated BEFORE UPDATE ON public.color_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- favorite_stores
CREATE TABLE public.favorite_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  seasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.favorite_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own stores" ON public.favorite_stores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own stores" ON public.favorite_stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own stores" ON public.favorite_stores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own stores" ON public.favorite_stores FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_favorite_stores_updated BEFORE UPDATE ON public.favorite_stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- favorite_products
CREATE TABLE public.favorite_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.favorite_stores(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  price NUMERIC(10,2),
  season TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.favorite_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own products" ON public.favorite_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own products" ON public.favorite_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own products" ON public.favorite_products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own products" ON public.favorite_products FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_favorite_products_updated BEFORE UPDATE ON public.favorite_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_color_analyses_user ON public.color_analyses(user_id, created_at DESC);
CREATE INDEX idx_fav_stores_user ON public.favorite_stores(user_id, created_at DESC);
CREATE INDEX idx_fav_products_user ON public.favorite_products(user_id, created_at DESC);
