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

  // get_feed_posts (migration 00016) returns `setof posts` ordered by
  // created_at desc — chain .select() to fetch joined data in the same
  // round-trip. RPC ORDER BY is preserved by the result set, so no manual
  // reorder.
  const { data, error } = await supabase
    .rpc("get_feed_posts", {
      p_tag_name: options.tag ?? null,
      p_cursor_created_at: options.cursor?.created_at ?? null,
      p_limit: limit,
    })
    .select(
      `
      *,
      author:profiles!author_id(*),
      assets(*),
      post_tags(tag:tags(*)),
      comments(count),
      reactions(count)
    `
    );

  if (error) throw error;
  const posts = data ?? [];

  let nextCursor: FeedCursor | null = null;
  if (posts.length >= limit) {
    const last = posts[posts.length - 1] as { created_at: string };
    nextCursor = { created_at: last.created_at };
  }

  return { posts, nextCursor };
}

export async function searchPosts(
  supabase: SupabaseClient,
  options: { query: string; cursor?: FeedCursor; limit?: number }
): Promise<FeedPageResult> {
  const limit = options.limit ?? 20;
  const trimmed = options.query.trim();
  if (trimmed.length === 0) {
    return { posts: [], nextCursor: null };
  }

  // search_posts (migration 00017) returns setof posts ordered by ts_rank
  // desc, created_at desc — chain .select() for joined data in one round-trip.
  const { data, error } = await supabase
    .rpc("search_posts", {
      p_query: trimmed,
      p_cursor_created_at: options.cursor?.created_at ?? null,
      p_limit: limit,
    })
    .select(
      `
      *,
      author:profiles!author_id(*),
      assets(*),
      post_tags(tag:tags(*)),
      comments(count),
      reactions(count)
    `
    );

  if (error) throw error;
  const posts = data ?? [];

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
