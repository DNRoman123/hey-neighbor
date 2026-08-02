REVOKE ALL ON FUNCTION public.owner_accept_claim(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_accept_claim(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.owner_accept_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_accept_claim(uuid) TO service_role;