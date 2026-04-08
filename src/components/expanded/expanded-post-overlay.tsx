"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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

export function ExpandedPostOverlay() {
  const router = useRouter();
  const { sourceRect, postData, clear } = useExpansion();
  const [comments, setComments] = useState<Comment[]>([]);

  // Fetch comments client-side (non-blocking)
  useEffect(() => {
    if (!postData) return;
    const supabase = createClient();
    getComments(supabase, postData.id).then((data) => {
      if (data) setComments(data as Comment[]);
    });
  }, [postData]);

  const dismiss = useCallback(() => {
    clear();
    router.back();
  }, [router, clear]);

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
  const captionHeight = 48; // badge row height + gap

  // Image target: fills the card area minus caption space
  const cardWidth = vw * 0.38;
  const totalCardHeight = Math.min(vh - 120, 1020);
  const cardTop = (vh - totalCardHeight) / 2;
  const imageHeight = totalCardHeight - captionHeight;

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
          animate={{ opacity: 0.96 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </CursorCollapseIcon>

      {/* Expanded card — image FLIP + caption fade-in */}
      <ExpandedCard
        postData={postData}
        sourceRect={sourceRect}
        imageTargetRect={{
          top: cardTop,
          left: margin,
          width: cardWidth,
          height: imageHeight,
        }}
        captionTargetRect={{
          top: cardTop + imageHeight + 16,
          left: margin,
          width: cardWidth,
        }}
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
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          mass: 2,
          stiffness: 100,
          damping: 16,
          delay: 0.15,
        }}
      >
        <ExpandedCommentCard postId={postData.id} initialComments={comments} />
      </motion.div>
    </div>
  );
}
