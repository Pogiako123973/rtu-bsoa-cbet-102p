-- Promote admin@102p.edu to admin role.
-- Run this once in the Supabase SQL editor (Project → SQL → New query).
update public.profiles
set role = 'admin'
where email = 'admin@102p.edu';

-- If no row got updated, the user probably never had a profile row created.
-- Either because schema.sql wasn't run, or the trigger didn't fire.
-- Insert one defensively:
insert into public.profiles (id, email, full_name, role, student_id)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  'admin',
  nullif(u.raw_user_meta_data->>'student_id', '')
from auth.users u
where u.email = 'admin@102p.edu'
on conflict (id) do update set role = 'admin';

-- Verify:
select id, email, role from public.profiles where email = 'admin@102p.edu';