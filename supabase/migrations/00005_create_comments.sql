create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index idx_comments_post on public.comments(post_id);
create index idx_comments_parent on public.comments(parent_comment_id);

-- RLS
alter table public.comments enable row level security;

create policy "Authenticated can read comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "Authenticated can insert comments"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Author can update own comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Author can delete own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);
