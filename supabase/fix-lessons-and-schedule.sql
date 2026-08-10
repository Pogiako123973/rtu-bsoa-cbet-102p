-- All-in-one fix for existing deployments.
-- Run AFTER fix-profiles-recursion.sql.
-- Safe to re-run.

-- ============================================================
-- 1) schedules: make student_id nullable + RLS allows NULL
-- ============================================================

-- Drop the old per-student policy (in case it's the not-null variant)
drop policy if exists "schedules read all" on public.schedules;
drop policy if exists "schedules admin write" on public.schedules;

-- Guarantee student_id exists before any policy references it. Some
-- deployments skipped the class_code -> student_id migration, so the
-- column is missing entirely.
alter table public.schedules
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;

-- Loosen student_id to be nullable (so we can store "all students" rows).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'student_id'
      and is_nullable = 'NO'
  ) then
    alter table public.schedules alter column student_id drop not null;
  end if;
end $$;

-- Helpful index on student_id
create index if not exists schedules_student_id_idx on public.schedules (student_id);

-- New RLS: students see their own rows + shared (NULL) rows; admins see all.
create policy "schedules read all" on public.schedules
  for select to authenticated using (
    student_id = auth.uid()
    or student_id is null
    or public.current_user_role() = 'admin'
  );

create policy "schedules admin write" on public.schedules
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- 2) lessons: add attachment columns + storage bucket
-- ============================================================

alter table public.lessons
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', false)
on conflict (id) do nothing;

drop policy if exists "lesson files read auth" on storage.objects;
create policy "lesson files read auth" on storage.objects
  for select to authenticated using (bucket_id = 'lesson-files');

drop policy if exists "lesson files admin write" on storage.objects;
create policy "lesson files admin write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'lesson-files' and public.current_user_role() = 'admin'
  );

drop policy if exists "lesson files admin update" on storage.objects;
create policy "lesson files admin update" on storage.objects
  for update to authenticated using (
    bucket_id = 'lesson-files' and public.current_user_role() = 'admin'
  );

drop policy if exists "lesson files admin delete" on storage.objects;
create policy "lesson files admin delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'lesson-files' and public.current_user_role() = 'admin'
  );