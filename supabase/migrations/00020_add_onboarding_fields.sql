-- Add onboarding fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN color text,
  ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

-- Mark all existing users as already onboarded so they skip the overlay
UPDATE public.profiles SET onboarding_complete = true WHERE created_at < now();
