import { SupabaseClient } from "@supabase/supabase-js";

export interface FeedCursor {
  created_at: string;
}

export interface FeedPageResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[];
  nextCursor: FeedCursor | null;
}

export async function getFeedPosts(
  supabase: SupabaseClient,
  options: { tag?: string; cursor?: FeedCursor; limit?: number } = {}
): Promise<FeedPageResult> {
  const limit = options.limit ?? 20;

  // Use RPC to get sorted/filtered post IDs (handles tag filtering server-side)
  const { data: idRows, error: rpcError } = await supabase.rpc(
    "get_feed_posts",
    {
      p_tag_name: options.tag ?? null,
      p_cursor_created_at: options.cursor?.created_at ?? null,
      p_limit: limit,
    }
  );

  if (rpcError) throw rpcError;
  if (!idRows || idRows.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const ids = idRows.map((r: { post_id: string }) => r.post_id);

  // Fetch full post data for those IDs
  const { data, error } = await supabase
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
    .in("id", ids);

  if (error) throw error;

  // Re-sort to match RPC order (`.in()` doesn't preserve order)
  const orderMap = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  const posts = (data ?? []).sort(
    (a: { id: string }, b: { id: string }) =>
      (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  // Build next cursor
  let nextCursor: FeedCursor | null = null;
  if (posts.length >= limit) {
    const last = posts[posts.length - 1] as { created_at: string };
    nextCursor = { created_at: last.created_at };
  }

  return { posts, nextCursor };
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
    assets?: { file_path: string; mime_type: string; size_bytes: number; width?: number | null; height?: number | null }[];
  }
) {
  // All inserts happen inside a single DB transaction via RPC so a mid-flight
  // failure (tag upsert, asset insert) no longer leaves an orphan post.
  const { data: postId, error: rpcError } = await supabase.rpc(
    "create_post_with_relations",
    {
      p_title: post.title,
      p_body: post.body ?? "",
      p_visibility: post.visibility ?? "internal",
      p_tag_names: post.tags ?? [],
      p_assets: (post.assets ?? []).map((a) => ({
        file_path: a.file_path,
        mime_type: a.mime_type,
        size_bytes: String(a.size_bytes),
        width: a.width == null ? "" : String(a.width),
        height: a.height == null ? "" : String(a.height),
      })),
    }
  );

  if (rpcError) throw rpcError;

  const { data: newPost, error: fetchError } = await supabase
    .from("posts")
    .select()
    .eq("id", postId)
    .single();

  if (fetchError) throw fetchError;
  return newPost;
}

export async function deletePost(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
