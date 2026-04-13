import { SupabaseClient } from "@supabase/supabase-js";

export interface ReactionRow {
  id: string;
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  emoji: string;
  created_at: string;
}

export async function getPostReactions(
  supabase: SupabaseClient,
  postId: string
): Promise<ReactionRow[]> {
  const { data, error } = await supabase
    .from("reactions")
    .select("*")
    .eq("post_id", postId);
  if (error) throw error;
  return data ?? [];
}

export async function toggleReaction(
  supabase: SupabaseClient,
  reaction: {
    emoji: string;
    post_id?: string;
    comment_id?: string;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if reaction already exists
  let query = supabase
    .from("reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("emoji", reaction.emoji);

  if (reaction.post_id) {
    query = query.eq("post_id", reaction.post_id);
  } else if (reaction.comment_id) {
    query = query.eq("comment_id", reaction.comment_id);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Remove reaction
    await supabase.from("reactions").delete().eq("id", existing.id);
    return { action: "removed" as const };
  } else {
    // Add reaction
    await supabase.from("reactions").insert({
      user_id: user.id,
      emoji: reaction.emoji,
      post_id: reaction.post_id || null,
      comment_id: reaction.comment_id || null,
    });
    return { action: "added" as const };
  }
}
