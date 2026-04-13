-- Issue #44: defensive dedupe on notifications.
-- mentions(comment_id, mentioned_user_id) is already UNIQUE so the literal
-- "same user mentioned twice in one comment" path is already blocked, but
-- adding (user_id, type, reference_id) as a unique safety net protects against
-- future trigger / backfill / replay paths that could re-emit a notification.

create unique index if not exists uq_notifications_dedupe
  on public.notifications (user_id, type, reference_id);

-- Make the existing trigger functions tolerate the constraint instead of
-- raising. Each trigger now uses on conflict do nothing so a duplicate signal
-- silently drops rather than aborting the originating insert (which would
-- cascade-fail the comment / mention / reaction).

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
  select p.author_id, 'comment', new.id, new.author_id, new.post_id
  from public.posts p
  where p.id = new.post_id and p.author_id != new.author_id
  on conflict (user_id, type, reference_id) do nothing;

  if new.parent_comment_id is not null then
    insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
    select c.author_id, 'comment', new.id, new.author_id, new.post_id
    from public.comments c
    where c.id = new.parent_comment_id
      and c.author_id != new.author_id
      and c.author_id != (select author_id from public.posts where id = new.post_id)
    on conflict (user_id, type, reference_id) do nothing;
  end if;

  return new;
end;
$$;

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
    and c.author_id != new.mentioned_user_id
  on conflict (user_id, type, reference_id) do nothing;
  return new;
end;
$$;

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
    where p.id = new.post_id and p.author_id != new.user_id
    on conflict (user_id, type, reference_id) do nothing;
  elsif new.comment_id is not null then
    insert into public.notifications (user_id, type, reference_id, actor_id, post_id)
    select c.author_id, 'reaction', new.id, new.user_id, c.post_id
    from public.comments c
    where c.id = new.comment_id and c.author_id != new.user_id
    on conflict (user_id, type, reference_id) do nothing;
  end if;
  return new;
end;
$$;
