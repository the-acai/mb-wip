"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 250;

export function useRealtimeNotifications(
  userId: string | undefined,
  onNew: (notification: Record<string, unknown>) => void
) {
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const pendingIds = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async () => {
      flushTimer = null;
      if (pendingIds.size === 0) return;
      const ids = Array.from(pendingIds);
      pendingIds.clear();
      const { data } = await supabase
        .from("notifications")
        .select("*, actor:profiles!actor_id(*), post:posts!post_id(id, title)")
        .in("id", ids);
      if (data) {
        for (const row of data) onNewRef.current(row);
      }
    };

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Coalesce bursts of mention/reaction notifications into one fetch.
          pendingIds.add(payload.new.id as string);
          if (flushTimer === null) {
            flushTimer = setTimeout(flush, DEBOUNCE_MS);
          }
        }
      )
      .subscribe();

    return () => {
      if (flushTimer !== null) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
