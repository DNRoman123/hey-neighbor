REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.contains_banned_words(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_listing_language() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_message_language() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_language() FROM anon, authenticated;