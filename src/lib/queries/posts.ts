import { SupabaseClient } from "@supabase/supabase-js";

export async function getFeedPosts(
  supabase: SupabaseClient,
  options: { tag?: string; cursor?: string; limit?: number } = {}
) {
  const limit = options.limit ?? 20;

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!author_id(*),
      assets(*),
      post_tags(tag:tags(*)),
      comments(count),
      reactions(count)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by tag client-side (Supabase doesn't support filtering on nested joins easily)
  if (options.tag && data) {
    return data.filter((post: Record<string, unknown>) =>
      (post.post_tags as { tag: { name: string } }[])?.some(
        (pt) => pt.tag?.name === options.tag
      )
    );
  }

  return data;
}

export async function getPost(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!author_id(*),
      assets(*),
      post_tags(tag:tags(*)),
      reactions(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPost(
  supabase: SupabaseClient,
  post: {
    title: string;
    body?: string;
    visibility?: string;
    tags?: string[];
    assets?: { file_path: string; mime_type: string; size_bytes: number }[];
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Insert post
  const { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title: post.title,
      body: post.body || null,
      visibility: post.visibility || "internal",
    })
    .select()
    .single();

  if (postError) throw postError;

  // Insert tags
  if (post.tags?.length) {
    for (const tagName of post.tags) {
      // Upsert tag
      const { data: tag } = await supabase
        .from("tags")
        .upsert({ name: tagName.toLowerCase().trim() }, { onConflict: "name" })
        .select()
        .single();

      if (tag) {
        await supabase
          .from("post_tags")
          .insert({ post_id: newPost.id, tag_id: tag.id });
      }
    }
  }

  // Insert assets
  if (post.assets?.length) {
    await supabase.from("assets").insert(
      post.assets.map((asset, i) => ({
        post_id: newPost.id,
        file_path: asset.file_path,
        mime_type: asset.mime_type,
        size_bytes: asset.size_bytes,
        display_order: i,
      }))
    );
  }

  return newPost;
}

export async function deletePost(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
