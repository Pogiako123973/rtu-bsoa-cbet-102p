-- Convert schedules to per-student (no class_code).
-- Run AFTER fix-profiles-recursion.sql.
-- Safe to re-run.

-- If class_code column exists, drop the policies that reference it and the helper.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'class_code'
  ) then
    -- Drop policies that mention class_code
    drop policy if exists "schedules read all" on public.schedules;
    -- We don't know if class_code is the current_user_class_code variant; just nuke all schedules policies to be safe
    execute 'drop policy if exists "schedules admin write" on public.schedules';
  end if;
end $$;

-- Drop the class_code helper function (no longer needed)
drop function if exists public.current_user_class_code();

-- Add student_id if it doesn't exist yet.
-- IMPORTANT: this MUST run unconditionally. The earlier "if class_code
-- exists" block didn't add student_id on a fresh schema, so any DB
-- that's missing both columns is stuck without it.
alter table public.schedules
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;

-- Backfill student_id for any existing rows using the legacy class_code
-- (best-effort: skip rows we can't resolve).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'class_code'
  ) then
    update public.schedules s
      set student_id = p.id
      from public.profiles p
      where p.role = 'student'
        and p.class_code = s.class_code
        and s.student_id is null;
  end if;
end $$;

-- Drop class_code column from schedules (no longer needed)
alter table public.schedules drop column if exists class_code;

-- Drop class_code column from profiles (no longer needed)
alter table public.profiles drop column if exists class_code;

-- Drop class_code index if it exists
drop index if exists public.schedules_class_code_idx;
drop index if exists public.profiles_class_code_idx;

-- Add helpful index on student_id
create index if not exists schedules_student_id_idx on public.schedules (student_id);

-- Recreate the per-student RLS policy
drop policy if exists "schedules read all" on public.schedules;
create policy "schedules read all" on public.schedules
  for select to authenticated using (
    student_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists "schedules admin write" on public.schedules;
create policy "schedules admin write" on public.schedules
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');