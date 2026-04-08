"use client";

import { useEffect, useCallback, useState } from "react";
import { motion } from "motion/react";

import { ExpandedCard } from "./expanded-card";
import { ExpandedCommentCard } from "./expanded-comment-card";
import { CursorCollapseIcon } from "./cursor-collapse-icon";
import { useExpansion } from "./expansion-context";
import { createClient } from "@/lib/supabase/client";
import { getComments } from "@/lib/queries/comments";

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string; avatar_url: string | null };
  reactions: { emoji: string; user_id: string }[];
}

// ~40% faster spring, matching expanded-card.tsx
const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

export function ExpandedPostOverlay() {
  const { sourceRect, postData, closing, startClose, clear } = useExpansion();
  const [comments, setComments] = useState<Comment[]>([]);

  // Fetch comments client-side (non-blocking)
  useEffect(() => {
    if (!postData) return;
    const supabase = createClient();
    getComments(supabase, postData.id).then((data) => {
      if (data) setComments(data as Comment[]);
    });
  }, [postData]);

  // Dismiss: start close animation, then clear after it settles
  const dismiss = useCallback(() => {
    if (closing) return;
    startClose();
    // Wait for spring to settle, then clear state and update URL
    setTimeout(() => {
      clear();
      window.history.back();
    }, 500);
  }, [closing, startClose, clear]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dismiss]);

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!postData) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = vw * 0.0833;
  const gap = 24;

  // Full card target (image + caption, same flex layout as grid card)
  const cardWidth = vw * 0.38;
  const totalCardHeight = Math.min(vh - 120, 1020);
  const cardTop = (vh - totalCardHeight) / 2;

  // Comment panel position
  const commentLeft = margin + cardWidth + gap;
  const commentWidth = vw * 0.40;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <CursorCollapseIcon onDismiss={dismiss}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </CursorCollapseIcon>

      {/* Expanded card — single container FLIP (image + caption) */}
      <ExpandedCard
        postData={postData}
        sourceRect={sourceRect}
        targetRect={{
          top: cardTop,
          left: margin,
          width: cardWidth,
          height: totalCardHeight,
        }}
        closing={closing}
      />

      {/* Comment card */}
      <motion.div
        className="pointer-events-auto absolute"
        style={{
          top: cardTop,
          left: commentLeft,
          width: commentWidth,
          maxHeight: totalCardHeight,
        }}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: closing ? 60 : 0, opacity: closing ? 0 : 1 }}
        transition={EXPANSION_SPRING}
      >
        <ExpandedCommentCard postId={postData.id} initialComments={comments} />
      </motion.div>
    </div>
  );
}
