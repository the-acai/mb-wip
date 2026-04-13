-- Issue #69: full-text search across post title + body.

-- 1. tsvector column generated from title + body. English dictionary per
-- product direction. STORED so the GIN index can use it.
alter table public.posts
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(body, '')
    )
  ) stored;

create index if not exists idx_posts_search_tsv
  on public.posts using gin (search_tsv);

-- 2. RPC that mirrors get_feed_posts (returns setof posts so the client can
-- chain .select() for joined data — same pattern as #51). Uses
-- websearch_to_tsquery so common syntax works (quoted phrases, -exclude).
-- Empty / whitespace-only queries return empty.
create or replace function public.search_posts(
  p_query text,
  p_cursor_created_at timestamptz default null,
  p_limit int default 20
)
returns setof public.posts
language sql stable
as $$
  with q as (
    select
      case
        when p_query is null or length(trim(p_query)) = 0 then null
        else websearch_to_tsquery('english', p_query)
      end as tsq
  )
  select p.*
  from public.posts p, q
  where
    q.tsq is not null
    and p.search_tsv @@ q.tsq
    and (p_cursor_created_at is null or p.created_at < p_cursor_created_at)
  order by ts_rank(p.search_tsv, q.tsq) desc, p.created_at desc, p.id desc
  limit p_limit;
$$;

grant execute on function public.search_posts(text, timestamptz, int)
  to authenticated;
