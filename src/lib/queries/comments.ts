import { SupabaseClient } from "@supabase/supabase-js";

export async function getComments(supabase: SupabaseClient, postId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      author:profiles!author_id(*),
      reactions(*)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createComment(
  supabase: SupabaseClient,
  comment: {
    post_id: string;
    body: string;
    parent_comment_id?: string;
    mentions?: string[];
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: comment.post_id,
      author_id: user.id,
      body: comment.body,
      parent_comment_id: comment.parent_comment_id || null,
    })
    .select("*, author:profiles!author_id(*)")
    .single();

  if (error) throw error;

  // Insert mentions
  if (comment.mentions?.length && data) {
    await supabase.from("mentions").insert(
      comment.mentions.map((userId) => ({
        comment_id: data.id,
        mentioned_user_id: userId,
      }))
    );
  }

  return data;
}

export async function deleteComment(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}
