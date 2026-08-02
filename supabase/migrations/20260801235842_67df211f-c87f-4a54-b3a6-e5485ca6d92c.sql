ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'EUR';

CREATE OR REPLACE FUNCTION public.owner_accept_claim(_claim_id uuid, _currency text DEFAULT 'EUR')
RETURNS TABLE(id uuid, status claim_status, fee_cents integer, currency text, is_free boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.claims;
  used integer;
  free boolean;
  fee integer;
  claim_currency text;
BEGIN
  SELECT * INTO c FROM public.claims WHERE public.claims.id = _claim_id;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;
  IF c.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the item owner can agree to this request';
  END IF;
  IF c.owner_accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT c.id, c.status, c.fee_cents, c.currency, c.is_free;
    RETURN;
  END IF;
  IF c.receiver_accepted_at IS NULL THEN
    RAISE EXCEPTION 'The receiver has not accepted this item yet';
  END IF;

  claim_currency := COALESCE(NULLIF(upper(_currency), ''), 'EUR');
  IF claim_currency NOT IN ('EUR', 'USD', 'GBP') THEN
    claim_currency := 'EUR';
  END IF;

  used := public.free_claims_used(c.receiver_id);
  free := used < 5;
  fee := CASE WHEN free THEN 0 ELSE 100 END;

  UPDATE public.claims SET
    owner_accepted_at = now(),
    is_free = free,
    fee_cents = fee,
    currency = claim_currency,
    status = CASE WHEN free THEN 'confirmed'::claim_status ELSE 'pending_payment'::claim_status END,
    updated_at = now()
  WHERE public.claims.id = _claim_id
  RETURNING public.claims.id, public.claims.status, public.claims.fee_cents, public.claims.currency, public.claims.is_free
  INTO c.id, c.status, c.fee_cents, c.currency, c.is_free;

  RETURN QUERY SELECT c.id, c.status, c.fee_cents, c.currency, c.is_free;
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_accept_claim(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_accept_claim(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.owner_accept_claim(uuid, text) IS 'Owner agrees to give the item. Counts toward the 5 free claims/month; 6th+ costs 1 unit of the requested currency.';