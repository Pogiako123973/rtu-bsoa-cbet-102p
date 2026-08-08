-- Provision the school admin user.
-- Email: admin@rtu.edu
-- Password: Pogiako123
-- Role: admin
--
-- This creates the auth user, sets the password, confirms the email so
-- password login works without confirmation, creates the profile, and
-- grants the 'admin' role. All other signups continue to use the regular
-- signup flow and are assigned 'student' by handle_new_user().
--
-- Safe to re-run: idempotent (DO blocks check existence).

-- Requires pgcrypto (enabled by default on Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Pick up an existing user with this email if one already exists.
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@rtu.edu';

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@rtu.edu',
      crypt('Pogiako123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    -- Force the password to the known value on every re-run.
    UPDATE auth.users
       SET encrypted_password = crypt('Pogiako123', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = admin_id;
  END IF;

  -- Profile row (matches what handle_new_user() does for normal signups).
  INSERT INTO public.profiles (id, full_name, email, year_level)
  VALUES (admin_id, 'School Admin', 'admin@rtu.edu', '')
  ON CONFLICT (id) DO NOTHING;

  -- Grant admin role (keep other roles if they exist).
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  -- Make sure other roles (e.g. student) aren't present on this user.
  DELETE FROM public.user_roles
   WHERE user_id = admin_id AND role <> 'admin';
END $$;