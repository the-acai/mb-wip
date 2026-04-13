"use client";

import { useState, useCallback, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { toggleReaction } from "@/lib/queries/reactions";
import { useRealtimeReactions } from "@/hooks/use-realtime-reactions";
import { cn } from "@/lib/utils";
import { SmilePlusIcon } from "lucide-react";

const EMOJI_OPTIONS = ["👍", "🔥", "💯", "❤️", "😂", "👀", "🎉", "🤯"];

interface Reaction {
  id?: string;
  emoji: string;
  user_id: string;
}

interface ReactionPickerProps {
  postId: string;
  initialReactions: Reaction[];
  currentUserId?: string;
}

/**
 * Post-level reaction picker. Renders a chip strip of distinct emoji + counts
 * (own selections highlighted) followed by a "+" trigger that opens a popover
 * with the curated emoji set. Optimistic toggles; realtime hook reconciles
 * inserts / deletes from other clients.
 */
export function ReactionPicker({
  postId,
  initialReactions,
  currentUserId,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const supabase = createClient();

  // If the parent ever re-fetches initial reactions, sync into state.
  useEffect(() => {
    setReactions(initialReactions);
  }, [initialReactions]);

  // Realtime: INSERT/DELETE events from other clients (or our own server
  // round-trip). Optimistic local updates de-dupe by id when present.
  const handleInsert = useCallback((event: { id: string; user_id: string; emoji: string }) => {
    setReactions((prev) => {
      if (prev.some((r) => r.id === event.id)) return prev;
      return [...prev, event];
    });
  }, []);
  const handleDelete = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);
  useRealtimeReactions(postId, handleInsert, handleDelete);

  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  const ownEmojis = new Set(
    reactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji)
  );

  const handleToggle = async (emoji: string) => {
    if (!currentUserId) return;
    const isOwn = ownEmojis.has(emoji);

    // Optimistic flip — realtime + server response will reconcile.
    if (isOwn) {
      setReactions((prev) =>
        prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
      );
    } else {
      setReactions((prev) => [...prev, { emoji, user_id: currentUserId }]);
    }

    setOpen(false);
    try {
      await toggleReaction(supabase, { emoji, post_id: postId });
    } catch {
      // On error, revert by re-toggling locally
      if (isOwn) {
        setReactions((prev) => [...prev, { emoji, user_id: currentUserId }]);
      } else {
        setReactions((prev) =>
          prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
        );
      }
    }
  };

  const chips = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleToggle(emoji)}
          aria-pressed={ownEmojis.has(emoji)}
          aria-label={`${emoji} — ${count} reaction${count === 1 ? "" : "s"}${ownEmojis.has(emoji) ? ", you reacted" : ""}`}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-heading text-sm leading-none transition-colors",
            ownEmojis.has(emoji)
              ? "border-[var(--text-dark)] bg-[var(--text-dark)] text-[var(--page-bg)]"
              : "border-border bg-background text-[var(--text-caption)] hover:text-[var(--text-dark)]"
          )}
        >
          <span className="text-base leading-none">{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label="Add a reaction"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-[var(--text-caption)] transition-colors hover:text-[var(--text-dark)]"
        >
          <SmilePlusIcon className="size-4" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" side="top">
          <div className="flex gap-0.5">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggle(emoji)}
                aria-label={`React with ${emoji}`}
                className={cn(
                  "rounded-md p-1.5 text-xl leading-none transition-colors hover:bg-muted",
                  ownEmojis.has(emoji) && "bg-muted"
                )}
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
