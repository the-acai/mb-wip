"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeComments(
  postId: string,
  onInsert: (comment: Record<string, unknown>) => void,
  onDelete?: (commentId: string) => void
) {
  useEffect(() => {
    const supabase = createClient();

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
        async (payload) => {
          // Fetch the full comment with author profile
          const { data } = await supabase
            .from("comments")
            .select("*, author:profiles!author_id(*), reactions(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) onInsert(data);
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
          if (onDelete) onDelete(payload.old.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, onInsert, onDelete]);
}
