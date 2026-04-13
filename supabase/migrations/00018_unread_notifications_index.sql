-- Issue #55: notification queries that filter `read = false` (markAllAsRead,
-- unread badge) get a partial index for the hot path.
create index if not exists idx_notifications_unread
  on public.notifications (user_id)
  where read = false;
