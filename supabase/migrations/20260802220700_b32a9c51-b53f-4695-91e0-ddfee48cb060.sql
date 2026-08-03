ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS recovery_email text,
  ADD COLUMN IF NOT EXISTS recovery_phone text,
  ADD COLUMN IF NOT EXISTS recovery_method text NOT NULL DEFAULT 'email';