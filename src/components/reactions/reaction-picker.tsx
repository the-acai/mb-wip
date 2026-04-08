"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { toggleReaction } from "@/lib/queries/reactions";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["👍", "🔥", "❤️", "👀", "🚀", "🎉"];

interface Reaction {
  emoji: string;
  user_id: string;
}

interface ReactionPickerProps {
  reactions: Reaction[];
  postId?: string;
  commentId?: string;
  currentUserId?: string;
  onReactionChange?: () => void;
}

export function ReactionPicker({
  reactions,
  postId,
  commentId,
  currentUserId,
  onReactionChange,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [localReactions, setLocalReactions] = useState<Reaction[]>(reactions);
  const supabase = createClient();

  // Group reactions by emoji
  const grouped = localReactions.reduce(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const userReactions = new Set(
    localReactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji)
  );

  const handleToggle = async (emoji: string) => {
    // Optimistic update
    if (userReactions.has(emoji)) {
      setLocalReactions((prev) =>
        prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
      );
    } else if (currentUserId) {
      setLocalReactions((prev) => [
        ...prev,
        { emoji, user_id: currentUserId },
      ]);
    }

    await toggleReaction(supabase, {
      emoji,
      post_id: postId,
      comment_id: commentId,
    });

    onReactionChange?.();
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => handleToggle(emoji)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted",
            userReactions.has(emoji) && "border-primary/50 bg-primary/10"
          )}
        >
          <span>{emoji}</span>
          <span className="text-muted-foreground">{count}</span>
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-muted">
          +
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggle(emoji)}
                className="rounded-md p-1.5 text-lg transition-colors hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
