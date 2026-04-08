-- Trigger: new comment creates notification for post author (and parent comment author)
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Notify post author (skip self-notification)
  insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
  select p.author_id, 'comment', new.id, new.author_id, new.post_id
  from public.posts p
  where p.id = new.post_id and p.author_id != new.author_id;

  -- If reply, also notify parent comment author (skip if same as post author or self)
  if new.parent_comment_id is not null then
    insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
    select c.author_id, 'comment', new.id, new.author_id, new.post_id
    from public.comments c
    where c.id = new.parent_comment_id
      and c.author_id != new.author_id
      and c.author_id != (select author_id from public.posts where id = new.post_id);
  end if;

  return new;
end;
$$;

create trigger on_new_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Trigger: new mention creates notification
create or replace function public.notify_on_mention()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
  select new.mentioned_user_id, 'mention', new.id, c.author_id, c.post_id
  from public.comments c
  where c.id = new.comment_id
    and c.author_id != new.mentioned_user_id;
  return new;
end;
$$;

create trigger on_new_mention
  after insert on public.mentions
  for each row execute function public.notify_on_mention();

-- Trigger: new reaction creates notification
create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.post_id is not null then
    insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
    select p.author_id, 'reaction', new.id, new.user_id, new.post_id
    from public.posts p
    where p.id = new.post_id and p.author_id != new.user_id;
  elsif new.comment_id is not null then
    insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
    select c.author_id, 'reaction', new.id, new.user_id, c.post_id
    from public.comments c
    where c.id = new.comment_id and c.author_id != new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_new_reaction
  after insert on public.reactions
  for each row execute function public.notify_on_reaction();

-- Enable realtime for live updates
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.reactions;
