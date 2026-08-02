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
    AND owner_accepted_at >= date_trunc('month', now())
$function$;