ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS receiver_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_accepted_at timestamptz;

UPDATE public.claims
SET receiver_accepted_at = COALESCE(receiver_accepted_at, created_at),
    owner_accepted_at = COALESCE(owner_accepted_at, created_at)
WHERE status IN ('confirmed', 'completed');

UPDATE public.claims
SET receiver_accepted_at = COALESCE(receiver_accepted_at, created_at)
WHERE status = 'pending_payment';

CREATE OR REPLACE FUNCTION public.free_claims_used(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer FROM public.claims
  WHERE receiver_id = _user_id
    AND is_free = true
    AND status IN ('confirmed', 'completed')
    AND receiver_accepted_at IS NOT NULL
    AND owner_accepted_at IS NOT NULL
$function$;

CREATE OR REPLACE FUNCTION public.owner_accept_claim(_claim_id uuid)
RETURNS TABLE(id uuid, status claim_status, fee_cents integer, is_free boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.claims;
  used integer;
  free boolean;
BEGIN
  SELECT * INTO c FROM public.claims WHERE public.claims.id = _claim_id;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;
  IF c.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the item owner can agree to this request';
  END IF;
  IF c.owner_accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT c.id, c.status, c.fee_cents, c.is_free;
    RETURN;
  END IF;
  IF c.receiver_accepted_at IS NULL THEN
    RAISE EXCEPTION 'The receiver has not accepted this item yet';
  END IF;

  used := public.free_claims_used(c.receiver_id);
  free := used < 5;

  UPDATE public.claims SET
    owner_accepted_at = now(),
    is_free = free,
    fee_cents = CASE WHEN free THEN 0 ELSE 100 END,
    status = CASE WHEN free THEN 'confirmed'::claim_status ELSE 'pending_payment'::claim_status END,
    updated_at = now()
  WHERE public.claims.id = _claim_id
  RETURNING public.claims.id, public.claims.status, public.claims.fee_cents, public.claims.is_free
  INTO c.id, c.status, c.fee_cents, c.is_free;

  RETURN QUERY SELECT c.id, c.status, c.fee_cents, c.is_free;
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_accept_claim(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.owner_accept_claim(uuid) TO authenticated;