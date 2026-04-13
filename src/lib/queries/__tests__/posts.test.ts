import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFeedPosts, searchPosts } from "@/lib/queries/posts";

/**
 * Build a chainable mock of `supabase.rpc(name, params).select(cols)` that
 * resolves to `{ data, error }`. Records the rpc args so tests can assert
 * what got forwarded.
 */
function mockSupabase(data: unknown[] | null, error: unknown = null) {
  const rpcCalls: Array<{ name: string; params: unknown }> = [];
  const selectCalls: string[] = [];
  const supabase = {
    rpc: vi.fn((name: string, params: unknown) => {
      rpcCalls.push({ name, params });
      return {
        select: vi.fn((cols: string) => {
          selectCalls.push(cols);
          return Promise.resolve({ data, error });
        }),
      };
    }),
  } as unknown as SupabaseClient;
  return { supabase, rpcCalls, selectCalls };
}

describe("getFeedPosts", () => {
  it("calls get_feed_posts with cursor + limit and returns shaped result", async () => {
    const rows = [
      { id: "p1", created_at: "2026-04-10T00:00:00Z" },
      { id: "p2", created_at: "2026-04-09T00:00:00Z" },
    ];
    const { supabase, rpcCalls } = mockSupabase(rows);

    const result = await getFeedPosts(supabase, {
      tag: "design",
      cursor: { created_at: "2026-04-11T00:00:00Z" },
      limit: 2,
    });

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe("get_feed_posts");
    expect(rpcCalls[0].params).toEqual({
      p_tag_name: "design",
      p_cursor_created_at: "2026-04-11T00:00:00Z",
      p_limit: 2,
    });
    expect(result.posts).toHaveLength(2);
    // Hit limit → next cursor uses the last row's created_at
    expect(result.nextCursor).toEqual({ created_at: "2026-04-09T00:00:00Z" });
  });

  it("returns nextCursor=null when fewer rows than limit come back", async () => {
    const { supabase } = mockSupabase([
      { id: "p1", created_at: "2026-04-10T00:00:00Z" },
    ]);
    const result = await getFeedPosts(supabase, { limit: 20 });
    expect(result.nextCursor).toBeNull();
  });

  it("forwards null tag + null cursor when not provided", async () => {
    const { supabase, rpcCalls } = mockSupabase([]);
    await getFeedPosts(supabase, {});
    expect(rpcCalls[0].params).toEqual({
      p_tag_name: null,
      p_cursor_created_at: null,
      p_limit: 20,
    });
  });

  it("propagates supabase errors", async () => {
    const { supabase } = mockSupabase(null, new Error("boom"));
    await expect(getFeedPosts(supabase, {})).rejects.toThrow("boom");
  });
});

describe("searchPosts", () => {
  it("short-circuits to empty result for whitespace-only query", async () => {
    const { supabase, rpcCalls } = mockSupabase([]);
    const result = await searchPosts(supabase, { query: "   " });
    expect(rpcCalls).toHaveLength(0);
    expect(result).toEqual({ posts: [], nextCursor: null });
  });

  it("calls search_posts with trimmed query", async () => {
    const { supabase, rpcCalls } = mockSupabase([]);
    await searchPosts(supabase, { query: "  hello  " });
    expect(rpcCalls[0].name).toBe("search_posts");
    expect(rpcCalls[0].params).toEqual({
      p_query: "hello",
      p_cursor_created_at: null,
      p_limit: 20,
    });
  });
});
