-- Reverse index on post_tags for efficient tag-based lookups
create index idx_post_tags_tag_id on public.post_tags(tag_id);

-- RPC function: server-side feed with tag filtering and cursor pagination
create or replace function public.get_feed_posts(
  p_tag_name text default null,
  p_cursor_created_at timestamptz default null,
  p_limit int default 20
)
returns table(post_id uuid)
language sql stable
as $$
  select p.id as post_id
  from public.posts p
  left join public.post_tags pt on pt.post_id = p.id
  left join public.tags t on t.id = pt.tag_id
  where
    (p_tag_name is null or t.name = p_tag_name)
    and (p_cursor_created_at is null or p.created_at < p_cursor_created_at)
  group by p.id, p.created_at
  order by p.created_at desc, p.id desc
  limit p_limit;
$$;
