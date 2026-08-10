-- ============================================================================
-- ClassDesk Portal — Supabase schema
-- Run this ONCE in the Supabase SQL Editor on your new project:
-- https://supabase.com/dashboard/project/spvgmkxubrijdakhhnod/sql/new
-- ============================================================================

-- ---------- 1. profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  student_id text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

-- Helper: read the current user's role WITHOUT recursing through the
-- profiles RLS policy. Uses SECURITY DEFINER to bypass RLS, plus
-- stable marking so the planner can call it once per query.
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

drop policy if exists "profiles read self" on public.profiles;
create policy "profiles read self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all" on public.profiles
  for select using (public.current_user_role() = 'admin');

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- ---------- 2. lessons ----------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  content text not null,
  -- Optional attachment stored in the `lesson-files` bucket.
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

drop policy if exists "lessons read all" on public.lessons;
create policy "lessons read all" on public.lessons
  for select to authenticated using (true);

drop policy if exists "lessons admin write" on public.lessons;
create policy "lessons admin write" on public.lessons
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Storage bucket for lesson attachments (private; admins upload, students fetch via signed URL).
insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', false)
on conflict (id) do nothing;

-- Allow authenticated users to read lesson attachments via signed URLs.
-- The actual read happens via createSignedUrl(), which doesn't go through RLS,
-- but storage.objects policies still gate access if you use direct paths.
-- Keep this permissive for the app's bucket only.
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

-- ---------- 3. schedules ----------
-- Each row belongs to ONE student, or NULL meaning "all students"
-- (e.g. a class-wide event that applies to everyone).
-- Students see rows where student_id = auth.uid() OR student_id IS NULL;
-- admins see all rows.
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  subject text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now()
);

create index if not exists schedules_student_id_idx on public.schedules (student_id);

alter table public.schedules enable row level security;

-- Students see their own rows + shared rows (NULL student_id); admins see all.
drop policy if exists "schedules read all" on public.schedules;
create policy "schedules read all" on public.schedules
  for select to authenticated using (
    student_id = auth.uid()
    or student_id is null
    or public.current_user_role() = 'admin'
  );

drop policy if exists "schedules admin write" on public.schedules;
create policy "schedules admin write" on public.schedules
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------- 4. assignments ----------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  subject text not null,
  due_date timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.assignments enable row level security;

drop policy if exists "assignments read all" on public.assignments;
create policy "assignments read all" on public.assignments
  for select to authenticated using (true);

drop policy if exists "assignments admin write" on public.assignments;
create policy "assignments admin write" on public.assignments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------- 5. assignment_submissions ----------
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  status text not null default 'submitted' check (status in ('submitted', 'graded')),
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table public.assignment_submissions enable row level security;

drop policy if exists "submissions student read own" on public.assignment_submissions;
create policy "submissions student read own" on public.assignment_submissions
  for select using (student_id = auth.uid());

drop policy if exists "submissions admin read all" on public.assignment_submissions;
create policy "submissions admin read all" on public.assignment_submissions
  for select using (public.current_user_role() = 'admin');

drop policy if exists "submissions student write own" on public.assignment_submissions;
create policy "submissions student write own" on public.assignment_submissions
  for insert with check (student_id = auth.uid());

drop policy if exists "submissions student update own" on public.assignment_submissions;
create policy "submissions student update own" on public.assignment_submissions
  for update using (student_id = auth.uid());

-- ---------- 6. attendance ----------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  unique (student_id, schedule_id, date)
);

alter table public.attendance enable row level security;

drop policy if exists "attendance student read own" on public.attendance;
create policy "attendance student read own" on public.attendance
  for select using (student_id = auth.uid());

drop policy if exists "attendance admin read all" on public.attendance;
create policy "attendance admin read all" on public.attendance
  for select using (public.current_user_role() = 'admin');

drop policy if exists "attendance admin write" on public.attendance;
create policy "attendance admin write" on public.attendance
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------- 7. chat_messages ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'general',
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_idx on public.chat_messages (room, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat read all auth" on public.chat_messages;
create policy "chat read all auth" on public.chat_messages
  for select to authenticated using (true);

drop policy if exists "chat send auth" on public.chat_messages;
create policy "chat send auth" on public.chat_messages
  for insert to authenticated with check (sender_id = auth.uid());

-- ============================================================================
-- Auto-create profile + auto-confirm email on signup
-- This is what stops the "Email not confirmed" wall.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inferred_role text;
  inferred_name text;
  inferred_student_id text;
begin
  -- Pull hints from raw_user_meta_data, set by useAuth.signUp().
  -- First-ever user becomes admin so the school can self-provision;
  -- everyone after that defaults to student.
  if (select count(*) from public.profiles) = 0 then
    inferred_role := coalesce(new.raw_user_meta_data->>'role', 'admin');
  else
    inferred_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  end if;
  inferred_name := new.raw_user_meta_data->>'full_name';
  inferred_student_id := new.raw_user_meta_data->>'student_id';

  insert into public.profiles (id, email, full_name, role, student_id)
  values (
    new.id,
    new.email,
    nullif(inferred_name, ''),
    inferred_role,
    nullif(inferred_student_id, '')
  )
  on conflict (id) do nothing;

  -- Auto-confirm the email so users can sign in immediately
  update auth.users
     set email_confirmed_at = now()
   where id = new.id
     and email_confirmed_at is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- (Optional) Disable "Confirm email" toggle in Authentication → Providers
-- so newly created users don't receive a confirmation email.
-- You can do that from the dashboard, OR rely on the trigger above.
-- ============================================================================