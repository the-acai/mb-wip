-- Profiles table: synced from auth.users via trigger
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create index idx_profiles_email on public.profiles(email);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'email', new.email),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Domain restriction hook: rejects non-@matchboxstudio.com emails
-- Configure in Supabase Dashboard > Auth > Hooks > "Before User Created"
create or replace function public.hook_restrict_email_domain(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  user_email text;
  email_domain text;
begin
  user_email := event->'user'->>'email';
  email_domain := split_part(user_email, '@', 2);

  if lower(email_domain) != 'matchboxstudio.com' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Only @matchboxstudio.com accounts are allowed'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_restrict_email_domain to supabase_auth_admin;
revoke execute on function public.hook_restrict_email_domain from authenticated, anon, public;

-- RLS
alter table public.profiles enable row level security;

create policy "Authenticated can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
