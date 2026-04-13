"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { XIcon } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { getAuthorColor } from "@/lib/utils";

interface ReplyTarget {
  id: string;
  authorName: string;
}

interface ExpandedCommentFormProps {
  onSubmit: (body: string) => Promise<void>;
  replyingTo?: ReplyTarget | null;
  onCancelReply?: () => void;
}

export function ExpandedCommentForm({
  onSubmit,
  replyingTo,
  onCancelReply,
}: ExpandedCommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const { user } = useUser();
  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && replyingTo) {
      e.preventDefault();
      e.stopPropagation();
      onCancelReply?.();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            className="flex items-center justify-between rounded-md bg-[color-mix(in_srgb,var(--text-dark)_4%,transparent)] px-3 py-1.5 text-xs text-[var(--text-caption)]"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span>
              Replying to{" "}
              <span className="font-bold text-[var(--text-dark)]">
                @{replyingTo.authorName.toLowerCase()}
              </span>
            </span>
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                aria-label="Cancel reply"
                className="inline-flex items-center gap-1 text-[var(--text-caption)] hover:text-[var(--text-dark)]"
              >
                <XIcon className="size-3" aria-hidden="true" />
                Esc
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="flex h-14 items-center overflow-hidden rounded-lg border bg-[var(--page-bg)] px-4"
        animate={{ borderColor: focused ? userColor : "#dfe0e0" }}
        transition={{ type: "spring", mass: 1.2, stiffness: 170, damping: 16 }}
        aria-busy={submitting}
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            replyingTo
              ? `Reply to @${replyingTo.authorName.toLowerCase()}…`
              : "@user to reply, or add to the conversation."
          }
          aria-label="Add a comment (⌘+Enter to send)"
          aria-keyshortcuts="Meta+Enter Control+Enter"
          disabled={submitting}
          // Marker the overlay's focus-trap effect targets so opening a card
          // always lands focus in the comment box (even when comments exist
          // and otherwise-focusable Reply/Edit buttons would win the
          // "first focusable" lookup).
          data-overlay-autofocus
          className="flex-1 bg-transparent font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)] placeholder:text-[var(--text-caption)] focus:outline-none"
        />
      </motion.div>
    </div>
  );
}
