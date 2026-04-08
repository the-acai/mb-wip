create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('comment', 'mention', 'reaction')),
  reference_id uuid not null,
  actor_id uuid references public.profiles(id),
  post_id uuid references public.posts(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- RLS: users can only see and update their own notifications
alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
