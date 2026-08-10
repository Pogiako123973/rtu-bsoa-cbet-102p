-- Add class_code to schedules and profiles so each class sees its own schedule.
-- Safe to re-run. Run AFTER fix-profiles-recursion.sql.

-- ---------- schedules ----------
alter table public.schedules
  add column if not exists class_code text not null default 'DEFAULT';

create index if not exists schedules_class_code_idx
  on public.schedules (class_code);

-- RLS stays the same: read all for authenticated, admin writes all.

-- ---------- profiles ----------
alter table public.profiles
  add column if not exists class_code text;

create index if not exists profiles_class_code_idx
  on public.profiles (class_code);

-- ---------- helper: get current user's class_code (avoids RLS on profiles) ----------
create or replace function public.current_user_class_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select class_code from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_class_code() to authenticated;

-- ---------- schedules policy: students only see their own class ----------
drop policy if exists "schedules read all" on public.schedules;
create policy "schedules read all" on public.schedules
  for select to authenticated using (
    -- Admins see all classes
    public.current_user_role() = 'admin'
    -- Students see only their own class_code (fall back to DEFAULT if profile has none)
    or class_code = coalesce(public.current_user_class_code(), 'DEFAULT')
  );