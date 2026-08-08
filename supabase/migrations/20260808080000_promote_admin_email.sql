-- Promote a specific email to the 'admin' role.
-- This is a SAFE migration: it does NOT insert into auth.users.
-- The user must already exist (via /auth signup) before this runs.
--
-- After this migration:
--   - admin@rtu.edu  -> admin role
--   - all other users -> student role
--
-- Re-running this is safe; it just re-asserts the role assignment.

DO $$
DECLARE
  target_id uuid;
BEGIN
  -- Find the user by email.
  SELECT id INTO target_id FROM auth.users WHERE email = 'admin@rtu.edu';

  -- Nothing to do if the user hasn't signed up yet.
  IF target_id IS NULL THEN
    RAISE NOTICE 'admin@rtu.edu not yet signed up — skipping role assignment';
    RETURN;
  END IF;

  -- Remove any other roles on this user (no stale student/teacher).
  DELETE FROM public.user_roles WHERE user_id = target_id;

  -- Grant the admin role.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  -- Make sure the profile exists (in case the trigger didn't fire).
  INSERT INTO public.profiles (id, full_name, email, year_level)
  VALUES (target_id, 'School Admin', 'admin@rtu.edu', '')
  ON CONFLICT (id) DO NOTHING;
END $$;