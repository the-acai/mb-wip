"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeNotifications(
  userId: string | undefined,
  onNew: (notification: Record<string, unknown>) => void
) {
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

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
        async (payload) => {
          // Fetch full notification with actor and post
          const { data } = await supabase
            .from("notifications")
            .select("*, actor:profiles!actor_id(*), post:posts!post_id(id, title)")
            .eq("id", payload.new.id)
            .single();

          if (data) onNew(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNew]);
}
