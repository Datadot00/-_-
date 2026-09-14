-- Track first-profile onboarding separately from Supabase Auth confirmation.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed_version SMALLINT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Users that existed before onboarding was introduced keep their current
-- service access. New profiles created after this migration use version 0.
UPDATE public.users
SET
  onboarding_completed_version = 1,
  onboarding_completed_at = COALESCE(updated_at, created_at, NOW())
WHERE onboarding_completed_version IS NULL;

ALTER TABLE public.users
  ALTER COLUMN onboarding_completed_version SET DEFAULT 0,
  ALTER COLUMN onboarding_completed_version SET NOT NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_onboarding_state_consistent,
  ADD CONSTRAINT users_onboarding_state_consistent CHECK (
    (
      onboarding_completed_version = 0
      AND onboarding_completed_at IS NULL
    )
    OR (
      onboarding_completed_version > 0
      AND onboarding_completed_at IS NOT NULL
    )
  );

COMMENT ON COLUMN public.users.onboarding_completed_version IS
  'Completed onboarding contract version. Zero means first onboarding is pending.';
COMMENT ON COLUMN public.users.onboarding_completed_at IS
  'Server-recorded completion time for the current onboarding contract.';

COMMIT;
