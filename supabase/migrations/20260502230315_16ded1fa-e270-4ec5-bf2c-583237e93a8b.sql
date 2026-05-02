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