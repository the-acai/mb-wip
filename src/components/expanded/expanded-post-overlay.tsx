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

// Same spring as the card expansion
const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

export function ExpandedPostOverlay() {
  const { sourceRect, postData, closing, startClose, finishClose } = useExpansion();
  const [comments, setComments] = useState<Comment[]>([]);

  // Fetch comments client-side (non-blocking)
  useEffect(() => {
    if (!postData) return;
    const supabase = createClient();
    getComments(supabase, postData.id).then((data) => {
      if (data) setComments(data as Comment[]);
    });
  }, [postData]);

  // Manual dismiss: needs history.back() after animation completes
  const dismiss = useCallback(() => {
    if (closing) return;
    startClose(true);
  }, [closing, startClose]);

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
  const captionRowHeight = 48;

  // Card target sized to preserve image aspect ratio
  const cardWidth = vw * 0.38;
  const imageHeight = cardWidth / postData.imageAspect;
  const naturalCardHeight = imageHeight + captionRowHeight;
  const maxCardHeight = vh - 120;
  const totalCardHeight = Math.min(naturalCardHeight, maxCardHeight);
  const cardTop = (vh - totalCardHeight) / 2;

  // Comment panel position
  const commentLeft = margin + cardWidth + gap;
  const commentWidth = vw * 0.40;

  // Comment card starts fully behind the experiment card's right edge
  const commentSlideX = -(gap + commentWidth);

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <CursorCollapseIcon onDismiss={dismiss} hidden={closing}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </CursorCollapseIcon>

      {/* Comment card — slides from behind experiment card (lower z) */}
      <motion.div
        className="pointer-events-auto absolute"
        style={{
          top: cardTop,
          left: commentLeft,
          width: commentWidth,
          maxHeight: totalCardHeight,
          zIndex: 0,
        }}
        initial={{ x: commentSlideX, scale: 0.96, opacity: 0 }}
        animate={{
          x: closing ? commentSlideX : 0,
          scale: closing ? 0.96 : 1,
          opacity: closing ? 0 : 1,
        }}
        transition={{
          default: EXPANSION_SPRING,
          opacity: closing ? { duration: 0.1, ease: "easeOut" } : EXPANSION_SPRING,
        }}
      >
        <ExpandedCommentCard postId={postData.id} initialComments={comments} />
      </motion.div>

      {/* Expanded card — on top of comment card (higher z) */}
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
        onCloseComplete={finishClose}
      />
    </div>
  );
}
