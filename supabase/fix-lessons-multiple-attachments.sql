-- Add support for multiple attachments + web links per lesson.
-- Run AFTER fix-lessons-and-schedule.sql.
-- Safe to re-run.

-- 1) attachments jsonb column. When non-empty, this is the source of
--    truth. When empty, the legacy attachment_* columns are used so
--    older lessons still render correctly.
alter table public.lessons
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- 2) Shape validation.
--
--    We can't put a SELECT-subquery inside a CHECK constraint, and we
--    can't validate array elements with non-immutable calls either.
--    So: validate via a BEFORE INSERT/UPDATE trigger. It raises a
--    clear exception when an element is missing a required key, and
--    leaves the row unchanged when the shape is fine.
create or replace function public.lessons_check_attachments()
returns trigger
language plpgsql
as $$
declare
  e jsonb;
begin
  if jsonb_typeof(NEW.attachments) <> 'array' then
    raise exception 'attachments must be a JSON array, got %', jsonb_typeof(NEW.attachments);
  end if;

  for e in select value from jsonb_array_elements(NEW.attachments)
  loop
    if e->>'kind' is null then
      raise exception 'attachment missing "kind"';
    elsif (e->>'kind') = 'file' then
      if nullif(e->>'path', '') is null then
        raise exception 'file attachment missing "path"';
      end if;
      if nullif(e->>'name', '') is null then
        raise exception 'file attachment missing "name"';
      end if;
    elsif (e->>'kind') = 'link' then
      if nullif(e->>'url', '') is null then
        raise exception 'link attachment missing "url"';
      end if;
      if nullif(e->>'name', '') is null then
        raise exception 'link attachment missing "name"';
      end if;
    else
      raise exception 'unknown attachment kind: %', e->>'kind';
    end if;
  end loop;

  return NEW;
end $$;

drop trigger if exists lessons_check_attachments_trg on public.lessons;
create trigger lessons_check_attachments_trg
  before insert or update of attachments on public.lessons
  for each row execute function public.lessons_check_attachments();