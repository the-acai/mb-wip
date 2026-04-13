"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 250;

interface ReactionEvent {
  id: string;
  user_id: string;
  emoji: string;
}

/**
 * Subscribes to realtime INSERT/DELETE on the reactions table for a given
 * post. INSERTs are debounced + batch-fetched (same pattern as #54). DELETEs
 * pass through immediately (no fetch needed — the row id is already on the
 * payload).
 */
export function useRealtimeReactions(
  postId: string | undefined,
  onInsert: (reaction: ReactionEvent) => void,
  onDelete: (reactionId: string) => void
) {
  const onInsertRef = useRef(onInsert);
  const onDeleteRef = useRef(onDelete);
  onInsertRef.current = onInsert;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    if (!postId) return;
    const supabase = createClient();
    const pendingIds = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async () => {
      flushTimer = null;
      if (pendingIds.size === 0) return;
      const ids = Array.from(pendingIds);
      pendingIds.clear();
      const { data } = await supabase
        .from("reactions")
        .select("id, user_id, emoji")
        .in("id", ids);
      if (data) {
        for (const row of data) onInsertRef.current(row as ReactionEvent);
      }
    };

    const channel = supabase
      .channel(`reactions:post:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reactions",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
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
          table: "reactions",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          onDeleteRef.current(payload.old.id as string);
        }
      )
      .subscribe();

    return () => {
      if (flushTimer !== null) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, [postId]);
}
