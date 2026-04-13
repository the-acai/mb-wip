-- Issue #51: return full post rows from get_feed_posts so the client can
-- request joined data via .select() in a single round-trip and skip the
-- manual reorder dance (.in() doesn't preserve order).
--
-- The previous signature returned `table(post_id uuid)`; Postgres won't let
-- create-or-replace change a function's return type, so we drop + recreate.

drop function if exists public.get_feed_posts(text, timestamptz, int);

create function public.get_feed_posts(
  p_tag_name text default null,
  p_cursor_created_at timestamptz default null,
  p_limit int default 20
)
returns setof public.posts
language sql stable
as $$
  select p.*
  from public.posts p
  left join public.post_tags pt on pt.post_id = p.id
  left join public.tags t on t.id = pt.tag_id
  where
    (p_tag_name is null or t.name = p_tag_name)
    and (p_cursor_created_at is null or p.created_at < p_cursor_created_at)
  group by p.id
  order by p.created_at desc, p.id desc
  limit p_limit;
$$;

grant execute on function public.get_feed_posts(text, timestamptz, int)
  to authenticated;
