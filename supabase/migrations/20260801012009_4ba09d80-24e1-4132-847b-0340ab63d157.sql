ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Unopened Food',
  ADD COLUMN IF NOT EXISTS best_before date;

UPDATE public.listings SET best_before = expires_on WHERE best_before IS NULL;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_category_allowed
  CHECK (category IN ('Unopened Food', 'Canned Goods', 'Pasta & Rice', 'Cereal & Breakfast', 'Snacks', 'Drinks', 'Baking & Pantry'));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP FUNCTION IF EXISTS public.nearby_listings(double precision, double precision, numeric);

CREATE FUNCTION public.nearby_listings(_lat double precision, _lng double precision, _radius_km numeric DEFAULT 1)
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
    AND (
      _lat IS NULL OR l.lat IS NULL
      OR public.distance_km(_lat, _lng, l.lat, l.lng) <= _radius_km
    )
  ORDER BY distance_km NULLS LAST, l.created_at DESC
  LIMIT 100
$function$;