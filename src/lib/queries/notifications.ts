import { SupabaseClient } from "@supabase/supabase-js";

export async function getNotifications(
  supabase: SupabaseClient,
  options: { limit?: number; unreadOnly?: boolean } = {}
) {
  let query = supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!actor_id(*),
      post:posts!post_id(id, title)
    `
    )
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20);

  if (options.unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getUnreadCount(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) throw error;
  return count ?? 0;
}

export async function markAllAsRead(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) throw error;
}
