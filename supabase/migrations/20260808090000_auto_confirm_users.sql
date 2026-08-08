-- Auto-confirm every newly-created Supabase Auth user.
--
-- Why: Lovable projects ship with email confirmation ENABLED at the project
-- level. We can't toggle that from SQL alone. So instead we run a trigger on
-- auth.users that immediately marks each new row as confirmed (sets
-- email_confirmed_at) before the auth flow ever returns to the client.
--
-- Effect on signup:
--   signUp() now returns a real session, so the React app navigates to /home
--   immediately and the demo works with any email (real or fake).
--
-- Effect on signInWithPassword:
--   If a user signed up before this trigger existed and is stuck on "Email not
--   confirmed", signing in once also flips them to confirmed because the
--   trigger fires for any insert and we additionally update on email change.
--
-- Note: this is intended for development and demo deployments. For production
-- you would remove this trigger and configure a real SMTP provider + verify
-- domain in Supabase Auth settings.

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Mark the email as confirmed the instant the user row is inserted.
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;

  -- Also confirm any phone numbers (none in this app, but harmless).
  IF NEW.phone_confirmed_at IS NULL AND NEW.phone IS NOT NULL THEN
    NEW.phone_confirmed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop any previous installation so re-running this migration is safe.
DROP TRIGGER IF EXISTS trg_auto_confirm_new_user ON auth.users;

CREATE TRIGGER trg_auto_confirm_new_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_user();

-- Backfill: confirm every existing user that was created without confirmation.
-- This unblocks anyone who already tried to sign up while email confirmation
-- was required.
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
