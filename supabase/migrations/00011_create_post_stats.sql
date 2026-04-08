-- Materialized view: pre-computed reaction & comment counts per post
create materialized view public.post_stats as
select
  p.id as post_id,
  p.created_at,
  coalesce(count(distinct r.id), 0)::int as reaction_count,
  coalesce(count(distinct c.id), 0)::int as comment_count
from public.posts p
left join public.reactions r on r.post_id = p.id
left join public.comments c on c.post_id = p.id
group by p.id, p.created_at;

create unique index idx_post_stats_pk on public.post_stats(post_id);
create index idx_post_stats_reactions on public.post_stats(reaction_count desc, created_at desc, post_id);

-- Reverse index on post_tags for efficient tag-based lookups
create index idx_post_tags_tag_id on public.post_tags(tag_id);

-- RPC function: refresh the materialized view (called by cron)
create or replace function public.refresh_post_stats()
returns void
language sql
security definer set search_path = ''
as $$
  refresh materialized view concurrently public.post_stats;
$$;

-- RPC function: server-side feed with sorting, tag filtering, and cursor pagination
create or replace function public.get_feed_posts(
  p_tag_name text default null,
  p_sort text default 'newest',
  p_cursor_created_at timestamptz default null,
  p_cursor_sort_value int default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table(post_id uuid)
language sql stable
as $$
  select p.id as post_id
  from public.posts p
  left join public.post_tags pt on pt.post_id = p.id
  left join public.tags t on t.id = pt.tag_id
  left join public.post_stats ps on ps.post_id = p.id
  where
    (p_tag_name is null or t.name = p_tag_name)
    and case
      when p_sort = 'newest' and p_cursor_created_at is not null then
        p.created_at < p_cursor_created_at
      when p_sort = 'most_reactions' and p_cursor_sort_value is not null then
        (ps.reaction_count, p.id) < (p_cursor_sort_value, p_cursor_id)
      else true
    end
  group by p.id, p.created_at, ps.reaction_count
  order by
    case when p_sort = 'newest' then p.created_at end desc,
    case when p_sort = 'most_reactions' then ps.reaction_count end desc,
    p.created_at desc,
    p.id desc
  limit p_limit;
$$;
