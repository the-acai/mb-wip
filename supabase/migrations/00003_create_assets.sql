create table public.assets (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint,
  display_order int default 0,
  created_at timestamptz default now()
);

create index idx_assets_post on public.assets(post_id);

-- RLS
alter table public.assets enable row level security;

create policy "Authenticated can read assets"
  on public.assets for select
  to authenticated
  using (true);

create policy "Authenticated can insert assets"
  on public.assets for insert
  to authenticated
  with check (true);

create policy "Author can delete own assets"
  on public.assets for delete
  to authenticated
  using (
    (select auth.uid()) = (
      select author_id from public.posts where id = post_id
    )
  );
