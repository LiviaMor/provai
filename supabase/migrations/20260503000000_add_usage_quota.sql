-- Adiciona sistema de quotas de uso por usuário
-- Cada análise de IA consome 1 crédito; provador virtual consome 2 créditos.

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

-- Índices
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period);
CREATE INDEX IF NOT EXISTS idx_profiles_usage_reset ON public.profiles(usage_reset_at);

-- RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage" ON public.usage_tracking
  FOR ALL USING (true) WITH CHECK (true);

-- Função para incrementar uso e verificar quota
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

  -- Reset mensal automático
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

-- Função para consultar uso atual (chamada pelo frontend)
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

  -- Reset se necessário
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


-- Tabela de cache de análises (evita chamadas repetidas à IA)
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

-- Limpeza automática de cache expirado (> 7 dias) via cron ou manual
-- Para produção, configurar pg_cron:
-- SELECT cron.schedule('cleanup-cache', '0 3 * * *', $$DELETE FROM public.analysis_cache WHERE created_at < now() - interval '7 days'$$);
