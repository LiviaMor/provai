CREATE TABLE public.body_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'AvaliaÃ§Ã£o corporal',
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE public.account_type AS ENUM ('b2c', 'b2b');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  account_type public.account_type NOT NULL DEFAULT 'b2c',
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

-- color_analyses
CREATE TABLE public.color_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'AnÃ¡lise de coloraÃ§Ã£o',
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


-- Private bucket for user assessment photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-photos', 'assessment-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Each user can only access their own folder: <user_id>/...
CREATE POLICY "Users can view own assessment photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own assessment photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own assessment photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own assessment photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS capture_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;

-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_percent integer NOT NULL DEFAULT 100 CHECK (discount_percent BETWEEN 0 AND 100),
  access_days integer NOT NULL DEFAULT 30 CHECK (access_days > 0),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','b2c','b2b')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- No direct policies: only accessed via SECURITY DEFINER function

CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  access_until timestamptz NOT NULL,
  UNIQUE (coupon_id, user_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
ON public.coupon_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Profile: premium_access_until
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_access_until timestamptz;

-- Redeem function
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _access_until timestamptz;
  _existing public.coupon_redemptions%ROWTYPE;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _coupon FROM public.coupons
  WHERE upper(code) = upper(trim(_code)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT _coupon.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive');
  END IF;

  IF _coupon.valid_from > now() OR (_coupon.valid_until IS NOT NULL AND _coupon.valid_until < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached');
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_profile');
  END IF;

  IF _coupon.audience <> 'all' AND _coupon.audience <> _profile.account_type::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'audience_mismatch');
  END IF;

  SELECT * INTO _existing FROM public.coupon_redemptions
  WHERE coupon_id = _coupon.id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed', 'access_until', _existing.access_until);
  END IF;

  _access_until := GREATEST(COALESCE(_profile.premium_access_until, now()), now()) + (_coupon.access_days || ' days')::interval;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, access_until)
  VALUES (_coupon.id, _user, _access_until);

  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = _coupon.id;
  UPDATE public.profiles SET premium_access_until = _access_until WHERE user_id = _user;

  RETURN jsonb_build_object(
    'success', true,
    'access_until', _access_until,
    'access_days', _coupon.access_days,
    'discount_percent', _coupon.discount_percent
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;

-- Seed launch coupon valid 30 days
INSERT INTO public.coupons (code, description, discount_percent, access_days, audience, valid_until)
VALUES ('LANCAMENTO100', 'Acesso completo gratuito por 30 dias - lanÃ§amento', 100, 30, 'all', now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_team_size integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_size integer NOT NULL DEFAULT 1;

UPDATE public.coupons SET max_team_size = 5 WHERE upper(code) = 'LANCAMENTO100';

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _access_until timestamptz;
  _existing public.coupon_redemptions%ROWTYPE;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _coupon FROM public.coupons
  WHERE upper(code) = upper(trim(_code)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT _coupon.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive');
  END IF;

  IF _coupon.valid_from > now() OR (_coupon.valid_until IS NOT NULL AND _coupon.valid_until < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached');
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_profile');
  END IF;

  IF _coupon.audience <> 'all' AND _coupon.audience <> _profile.account_type::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'audience_mismatch');
  END IF;

  IF _coupon.max_team_size IS NOT NULL AND COALESCE(_profile.team_size, 1) > _coupon.max_team_size THEN
    RETURN jsonb_build_object('success', false, 'error', 'team_too_large', 'max_team_size', _coupon.max_team_size);
  END IF;

  SELECT * INTO _existing FROM public.coupon_redemptions
  WHERE coupon_id = _coupon.id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed', 'access_until', _existing.access_until);
  END IF;

  _access_until := GREATEST(COALESCE(_profile.premium_access_until, now()), now()) + (_coupon.access_days || ' days')::interval;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, access_until)
  VALUES (_coupon.id, _user, _access_until);

  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = _coupon.id;
  UPDATE public.profiles SET premium_access_until = _access_until WHERE user_id = _user;

  RETURN jsonb_build_object(
    'success', true,
    'access_until', _access_until,
    'access_days', _coupon.access_days,
    'discount_percent', _coupon.discount_percent
  );
END;
$function$;
-- Adiciona sistema de quotas de uso por usuÃ¡rio
-- Cada anÃ¡lise de IA consome 1 crÃ©dito; provador virtual consome 2 crÃ©ditos.

-- Tabela de uso mensal
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL, -- formato: 'YYYY-MM'
  body_analyses integer NOT NULL DEFAULT 0,
  color_analyses integer NOT NULL DEFAULT 0,
  tryon_uses integer NOT NULL DEFAULT 0,
  scale_detections integer NOT NULL DEFAULT 0,
  total_credits_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period)
);

-- Adiciona limites ao perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_credit_limit integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS credits_used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month';

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period);
CREATE INDEX IF NOT EXISTS idx_profiles_usage_reset ON public.profiles(usage_reset_at);

-- RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage" ON public.usage_tracking
  FOR ALL USING (true) WITH CHECK (true);

-- FunÃ§Ã£o para incrementar uso e verificar quota
CREATE OR REPLACE FUNCTION public.increment_usage(
  _feature text, -- 'body' | 'color' | 'tryon' | 'scale'
  _credits integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _period text;
  _new_total integer;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'no_profile');
  END IF;

  -- Reset mensal automÃ¡tico
  IF _profile.usage_reset_at <= now() THEN
    UPDATE public.profiles
    SET credits_used_this_month = 0,
        usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE user_id = _user;
    _profile.credits_used_this_month := 0;
  END IF;

  -- Verifica quota (0 = ilimitado para enterprise)
  IF _profile.monthly_credit_limit > 0 AND
     _profile.credits_used_this_month + _credits > _profile.monthly_credit_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'quota_exceeded',
      'used', _profile.credits_used_this_month,
      'limit', _profile.monthly_credit_limit,
      'resets_at', _profile.usage_reset_at
    );
  END IF;

  -- Incrementa no perfil
  _new_total := _profile.credits_used_this_month + _credits;
  UPDATE public.profiles
  SET credits_used_this_month = _new_total,
      updated_at = now()
  WHERE user_id = _user;

  -- Registra no tracking detalhado
  _period := to_char(now(), 'YYYY-MM');
  INSERT INTO public.usage_tracking (user_id, period)
  VALUES (_user, _period)
  ON CONFLICT (user_id, period) DO NOTHING;

  IF _feature = 'body' THEN
    UPDATE public.usage_tracking SET body_analyses = body_analyses + 1, total_credits_used = total_credits_used + _credits, updated_at = now() WHERE user_id = _user AND period = _period;
  ELSIF _feature = 'color' THEN
    UPDATE public.usage_tracking SET color_analyses = color_analyses + 1, total_credits_used = total_credits_used + _credits, updated_at = now() WHERE user_id = _user AND period = _period;
  ELSIF _feature = 'tryon' THEN
    UPDATE public.usage_tracking SET tryon_uses = tryon_uses + 1, total_credits_used = total_credits_used + _credits, updated_at = now() WHERE user_id = _user AND period = _period;
  ELSIF _feature = 'scale' THEN
    UPDATE public.usage_tracking SET scale_detections = scale_detections + 1, total_credits_used = total_credits_used + _credits, updated_at = now() WHERE user_id = _user AND period = _period;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', _new_total,
    'limit', _profile.monthly_credit_limit,
    'remaining', CASE WHEN _profile.monthly_credit_limit > 0 THEN _profile.monthly_credit_limit - _new_total ELSE -1 END,
    'resets_at', _profile.usage_reset_at
  );
END;
$$;

-- FunÃ§Ã£o para consultar uso atual (chamada pelo frontend)
CREATE OR REPLACE FUNCTION public.get_usage_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _tracking public.usage_tracking%ROWTYPE;
  _period text;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_profile');
  END IF;

  -- Reset se necessÃ¡rio
  IF _profile.usage_reset_at <= now() THEN
    UPDATE public.profiles
    SET credits_used_this_month = 0,
        usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE user_id = _user;
    _profile.credits_used_this_month := 0;
    _profile.usage_reset_at := date_trunc('month', now()) + interval '1 month';
  END IF;

  _period := to_char(now(), 'YYYY-MM');
  SELECT * INTO _tracking FROM public.usage_tracking WHERE user_id = _user AND period = _period;

  RETURN jsonb_build_object(
    'credits_used', _profile.credits_used_this_month,
    'credits_limit', _profile.monthly_credit_limit,
    'remaining', CASE WHEN _profile.monthly_credit_limit > 0 THEN _profile.monthly_credit_limit - _profile.credits_used_this_month ELSE -1 END,
    'resets_at', _profile.usage_reset_at,
    'breakdown', jsonb_build_object(
      'body_analyses', COALESCE(_tracking.body_analyses, 0),
      'color_analyses', COALESCE(_tracking.color_analyses, 0),
      'tryon_uses', COALESCE(_tracking.tryon_uses, 0),
      'scale_detections', COALESCE(_tracking.scale_detections, 0)
    )
  );
END;
$$;


-- Tabela de cache de anÃ¡lises (evita chamadas repetidas Ã  IA)
CREATE TABLE IF NOT EXISTS public.analysis_cache (
  cache_key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL, -- 'body' | 'color' | 'tryon' | 'scale'
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_user ON public.analysis_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_created ON public.analysis_cache(created_at);

-- RLS
ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages cache" ON public.analysis_cache
  FOR ALL USING (true) WITH CHECK (true);

-- Limpeza automÃ¡tica de cache expirado (> 7 dias) via cron ou manual
-- Para produÃ§Ã£o, configurar pg_cron:
-- SELECT cron.schedule('cleanup-cache', '0 3 * * *', $$DELETE FROM public.analysis_cache WHERE created_at < now() - interval '7 days'$$);

