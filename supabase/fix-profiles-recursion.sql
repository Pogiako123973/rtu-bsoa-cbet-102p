-- Fix: infinite recursion in profiles RLS policies.
-- Run this ONCE in the Supabase SQL editor.
-- Safe to re-run: everything here uses `create or replace` or `drop policy if exists`.

-- ---------- 1. Add a SECURITY DEFINER helper that reads the user's role
-- without going through the RLS-protected profiles table. ----------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role() to authenticated;

-- ---------- 2. Replace the recursive policy on profiles ----------
drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all" on public.profiles
  for select using (public.current_user_role() = 'admin');

-- (profiles read self is already fine; uses auth.uid() = id directly.)

-- ---------- 3. Clean up the other admin policies to use the same helper
-- (not strictly required for recursion, but clearer + faster). ----------
do $$
begin
  -- lessons admin write
  drop policy if exists "lessons admin write" on public.lessons;
  create policy "lessons admin write" on public.lessons
    for all using (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');

  -- schedules admin write
  drop policy if exists "schedules admin write" on public.schedules;
  create policy "schedules admin write" on public.schedules
    for all using (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');

  -- assignments admin write
  drop policy if exists "assignments admin write" on public.assignments;
  create policy "assignments admin write" on public.assignments
    for all using (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');

  -- submissions admin read all
  drop policy if exists "submissions admin read all" on public.assignment_submissions;
  create policy "submissions admin read all" on public.assignment_submissions
    for select using (public.current_user_role() = 'admin');

  -- attendance admin read all
  drop policy if exists "attendance admin read all" on public.attendance;
  create policy "attendance admin read all" on public.attendance
    for select using (public.current_user_role() = 'admin');

  -- attendance admin write
  drop policy if exists "attendance admin write" on public.attendance;
  create policy "attendance admin write" on public.attendance
    for all using (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');
end $$;