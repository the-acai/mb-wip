create table public.mentions (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references public.comments(id) on delete cascade not null,
  mentioned_user_id uuid references public.profiles(id) on delete cascade not null,
  unique(comment_id, mentioned_user_id)
);

create index idx_mentions_user on public.mentions(mentioned_user_id);

-- RLS
alter table public.mentions enable row level security;

create policy "Authenticated can read mentions"
  on public.mentions for select
  to authenticated
  using (true);

create policy "Authenticated can create mentions"
  on public.mentions for insert
  to authenticated
  with check (true);
