"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 250;

export function useRealtimeComments(
  postId: string,
  onInsert: (comment: Record<string, unknown>) => void,
  onDelete?: (commentId: string) => void
) {
  // Hold callbacks in refs so debounced flushes always read the latest closures
  // without forcing the channel to re-subscribe on every render.
  const onInsertRef = useRef(onInsert);
  const onDeleteRef = useRef(onDelete);
  onInsertRef.current = onInsert;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    const supabase = createClient();
    const pendingIds = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async () => {
      flushTimer = null;
      if (pendingIds.size === 0) return;
      const ids = Array.from(pendingIds);
      pendingIds.clear();
      const { data } = await supabase
        .from("comments")
        .select("*, author:profiles!author_id(*), reactions(*)")
        .in("id", ids);
      if (data) {
        for (const row of data) onInsertRef.current(row);
      }
    };

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          // Coalesce a burst of inserts into a single batched fetch so we go
          // from N round-trips to 1.
          pendingIds.add(payload.new.id as string);
          if (flushTimer === null) {
            flushTimer = setTimeout(flush, DEBOUNCE_MS);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          // No fetch needed for deletes — pass through immediately.
          onDeleteRef.current?.(payload.old.id as string);
        }
      )
      .subscribe();

    return () => {
      if (flushTimer !== null) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, [postId]);
}
