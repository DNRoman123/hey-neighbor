CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks" ON public.blocked_users
  FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = _a AND b.blocked_id = _b)
       OR (b.blocker_id = _b AND b.blocked_id = _a)
  )
$$;

-- Shared profanity / sexual-language guard
CREATE OR REPLACE FUNCTION public.contains_banned_words(_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
  w text;
  words text[] := ARRAY[
    'fuck','fucking','fucker','shit','bullshit','bitch','bastard','asshole','dickhead',
    'cunt','whore','slut','pussy','cock','dick','nigger','nigga','faggot','fag','retard',
    'motherfucker','wank','twat','porn','porno','pornography','nude','nudes','nudity','naked',
    'sex','sexy','sexual','horny','blowjob','handjob','anal','orgasm','masturbate','masturbation',
    'dildo','cum','boobs','tits','titty','penis','vagina','escort','hooker','prostitute','onlyfans',
    'puta','puto','mierda','joder','cabron','cabrón','pendejo','coño','polla','verga','chinga',
    'chingar','pinche','zorra','perra','maricon','maricón','culo','tetas','pito','desnudo','desnuda',
    'desnudos','desnudas','porno','sexo','sexual','caliente','follar','pajero','prostituta'
  ];
BEGIN
  IF _text IS NULL OR btrim(_text) = '' THEN RETURN false; END IF;
  t := lower(_text);
  t := translate(t, '0134578@$!*.,-_/\|:;()[]{}"''+', 'oieasbtas' || 'sia' || repeat(' ', 20));
  t := regexp_replace(t, '[^a-záéíóúñü ]', ' ', 'g');
  t := regexp_replace(t, '\s+', ' ', 'g');
  FOREACH w IN ARRAY words LOOP
    IF t ~ ('(^| )' || w || '(s|es)?( |$)') THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_listing_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.contains_banned_words(NEW.title) OR public.contains_banned_words(NEW.description)
     OR public.contains_banned_words(NEW.area_label) THEN
    RAISE EXCEPTION 'INAPPROPRIATE_LANGUAGE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_listing_language_trg
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_language();

CREATE OR REPLACE FUNCTION public.guard_message_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.contains_banned_words(NEW.body) THEN
    RAISE EXCEPTION 'INAPPROPRIATE_LANGUAGE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = NEW.conversation_id
      AND public.is_blocked_between(c.owner_id, c.receiver_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED_CONVERSATION';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_message_language_trg
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_language();

CREATE OR REPLACE FUNCTION public.guard_profile_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.contains_banned_words(NEW.first_name) OR public.contains_banned_words(NEW.last_name)
     OR public.contains_banned_words(NEW.username) OR public.contains_banned_words(NEW.area_label) THEN
    RAISE EXCEPTION 'INAPPROPRIATE_LANGUAGE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_profile_language_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_language();

CREATE OR REPLACE FUNCTION public.nearby_listings(_lat double precision, _lng double precision, _radius_km numeric DEFAULT 1)
 RETURNS TABLE(id uuid, owner_id uuid, title text, description text, condition text, category text, expires_on date, best_before date, photo_url text, area_label text, status listing_status, created_at timestamp with time zone, distance_km double precision, owner_first_name text, owner_last_name text, owner_avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.id, l.owner_id, l.title, l.description, l.condition, l.category, l.expires_on, l.best_before, l.photo_url,
         l.area_label, l.status, l.created_at,
         CASE WHEN l.lat IS NULL OR _lat IS NULL THEN NULL
              ELSE round(public.distance_km(_lat, _lng, l.lat, l.lng)::numeric, 2)::double precision END AS distance_km,
         p.first_name, p.last_name, p.avatar_url
  FROM public.listings l
  LEFT JOIN public.profiles p ON p.id = l.owner_id
  WHERE l.status = 'active'
    AND l.owner_id <> auth.uid()
    AND NOT public.is_blocked_between(l.owner_id, auth.uid())
    AND (
      _lat IS NULL OR l.lat IS NULL
      OR public.distance_km(_lat, _lng, l.lat, l.lng) <= _radius_km
    )
  ORDER BY distance_km NULLS LAST, l.created_at DESC
  LIMIT 100
$function$;