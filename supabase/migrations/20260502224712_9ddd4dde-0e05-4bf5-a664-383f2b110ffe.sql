
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
VALUES ('LANCAMENTO100', 'Acesso completo gratuito por 30 dias - lançamento', 100, 30, 'all', now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;
