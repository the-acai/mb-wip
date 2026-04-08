create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text,
  visibility text default 'internal' check (visibility in ('internal', 'public', 'unlisted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_posts_author on public.posts(author_id);
create index idx_posts_created on public.posts(created_at desc);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.update_updated_at();

-- RLS
alter table public.posts enable row level security;

create policy "Authenticated can read posts"
  on public.posts for select
  to authenticated
  using (true);

create policy "Author can insert posts"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Author can update own posts"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Author can delete own posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);
