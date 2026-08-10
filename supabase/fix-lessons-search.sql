-- Searchable lessons. Run AFTER fix-lessons-multiple-attachments.sql.
-- Safe to re-run.

-- 1) attachment_texts: a map {path -> extracted text} for each file
--    attachment. Filled in by the client at upload time when the file
--    type is something we can read (text, md, csv, json, code, etc.).
--    Links get the URL + display name flattened in here too.
alter table public.lessons
  add column if not exists attachment_texts jsonb not null default '{}'::jsonb;

-- 2) Generated full-text-search column. Postgres keeps it in sync with
--    title / subject / content / attachment_texts every time we write
--    a row, so we never have to remember to recompute it.
--
--    Postgres disallows subqueries inside a generation expression,
--    so we just cast the jsonb map to text. Both keys (storage paths)
--    and values (extracted text) end up in the index, which means a
--    user can also search by attachment file name / path.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons'
      and column_name = 'search_vector'
  ) then
    alter table public.lessons
      add column search_vector tsvector
      generated always as (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(subject, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(content, '')), 'A') ||
        setweight(
          to_tsvector(
            'simple',
            coalesce(attachment_texts::text, '')
          ),
          'C'
        )
      ) stored;
  end if;
end $$;

create index if not exists lessons_search_vector_idx
  on public.lessons using gin (search_vector);

-- 3) Search function. We use websearch_to_tsquery so users get a Google-
--    like syntax for free: "physics -exam" excludes "exam", "cat OR dog"
--    is OR, quoted phrases match exactly, etc.
create or replace function public.search_lessons(query text)
returns setof public.lessons
language sql
stable
as $$
  select *
  from public.lessons
  where query is null or length(trim(query)) = 0
     or search_vector @@ websearch_to_tsquery('simple', query)
  order by
    case when query is null or length(trim(query)) = 0 then 0
         else ts_rank(search_vector, websearch_to_tsquery('simple', query))
    end desc,
    created_at desc;
$$;

grant execute on function public.search_lessons(text) to authenticated;