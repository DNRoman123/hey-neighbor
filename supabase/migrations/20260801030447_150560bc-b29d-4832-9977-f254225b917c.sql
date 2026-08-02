ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_category_allowed;

UPDATE public.listings
  SET category = 'Unopened Food'
  WHERE category NOT IN ('Unopened Food', 'Clothing', 'Furniture', 'Item');

ALTER TABLE public.listings
  ADD CONSTRAINT listings_category_allowed
  CHECK (category IN ('Unopened Food', 'Clothing', 'Furniture', 'Item'));
