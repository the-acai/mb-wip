create table public.tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null
);

create index idx_tags_name on public.tags(name);

create table public.post_tags (
  post_id uuid references public.posts(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- RLS
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;

create policy "Authenticated can read tags"
  on public.tags for select
  to authenticated
  using (true);

create policy "Authenticated can create tags"
  on public.tags for insert
  to authenticated
  with check (true);

create policy "Authenticated can read post_tags"
  on public.post_tags for select
  to authenticated
  using (true);

create policy "Authenticated can create post_tags"
  on public.post_tags for insert
  to authenticated
  with check (true);

create policy "Post author can delete post_tags"
  on public.post_tags for delete
  to authenticated
  using (
    (select auth.uid()) = (
      select author_id from public.posts where id = post_id
    )
  );
