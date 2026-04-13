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

  // Insert mentions. Validate that every mentioned user id exists as a real
  // profile before inserting — the DB RLS policy now also enforces that the
  // caller is the comment author, but we strip bogus ids here so we never
  // hand Supabase a row that will 4xx and confuse the client.
  if (comment.mentions?.length && data) {
    const unique = Array.from(new Set(comment.mentions));
    const { data: validProfiles } = await supabase
      .from("profiles")
      .select("id")
      .in("id", unique);
    const validIds = new Set((validProfiles ?? []).map((p) => p.id as string));
    const rows = unique
      .filter((id) => validIds.has(id))
      .map((userId) => ({
        comment_id: data.id,
        mentioned_user_id: userId,
      }));
    if (rows.length > 0) {
      await supabase.from("mentions").insert(rows);
    }
  }

  return data;
}

export async function deleteComment(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

export async function updateComment(
  supabase: SupabaseClient,
  id: string,
  body: string
) {
  const trimmed = body.trim();
  if (trimmed.length === 0) throw new Error("Comment body cannot be empty");
  const { data, error } = await supabase
    .from("comments")
    .update({ body: trimmed })
    .eq("id", id)
    .select("*, author:profiles!author_id(*)")
    .single();
  if (error) throw error;
  return data;
}
