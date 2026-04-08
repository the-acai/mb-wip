create table public.reactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(user_id, post_id, emoji),
  unique(user_id, comment_id, emoji),
  check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  )
);

create index idx_reactions_post on public.reactions(post_id);
create index idx_reactions_comment on public.reactions(comment_id);

-- RLS
alter table public.reactions enable row level security;

create policy "Authenticated can read reactions"
  on public.reactions for select
  to authenticated
  using (true);

create policy "User can insert own reactions"
  on public.reactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "User can delete own reactions"
  on public.reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
