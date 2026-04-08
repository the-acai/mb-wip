"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

import { ExpandedCard } from "./expanded-card";
import { ExpandedCommentCard } from "./expanded-comment-card";
import { CursorCollapseIcon } from "./cursor-collapse-icon";
import { useExpansion } from "./expansion-context";

interface PostData {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  assets: {
    file_path: string;
    mime_type: string;
    width?: number | null;
    height?: number | null;
    signed_url?: string;
  }[];
  post_tags: { tag: { id: string; name: string } }[];
}

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

interface ExpandedPostOverlayProps {
  post: PostData;
  initialComments: Comment[];
}

/** Compute the target rects for the expanded card and comment panel from viewport */
function computeTargetRects(vw: number, vh: number) {
  const margin = vw * 0.0833;
  const gap = 24;
  const cardHeight = Math.min(vh - 120, 1020);
  const cardTop = (vh - cardHeight) / 2;

  // Card: left-aligned within the margin, ~38vw wide
  const cardWidth = vw * 0.38;
  const cardLeft = margin;

  // Comment panel: to the right of the card
  const commentWidth = vw * 0.40;
  const commentLeft = cardLeft + cardWidth + gap;
  const commentTop = cardTop;

  return {
    card: { top: cardTop, left: cardLeft, width: cardWidth, height: cardHeight },
    comment: { top: commentTop, left: commentLeft, width: commentWidth, height: cardHeight },
  };
}

export function ExpandedPostOverlay({ post, initialComments }: ExpandedPostOverlayProps) {
  const router = useRouter();
  const { sourceRect } = useExpansion();

  const dismiss = useCallback(() => {
    router.back();
  }, [router]);

  // Compute target rects once on mount (client-only component)
  const targets = useMemo(() => {
    if (typeof window === "undefined") return null;
    return computeTargetRects(window.innerWidth, window.innerHeight);
  }, []);

  // Escape key to dismiss
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

  if (!targets) return null;

  return (
    <AnimatePresence>
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

        {/* Expanded card — absolutely positioned, FLIP animated */}
        <ExpandedCard
          post={post}
          targetRect={targets.card}
          sourceRect={sourceRect}
        />

        {/* Comment card — absolutely positioned, slides up */}
        <div
          className="pointer-events-auto absolute"
          style={{
            top: targets.comment.top,
            left: targets.comment.left,
            width: targets.comment.width,
            maxHeight: targets.comment.height,
          }}
        >
          <ExpandedCommentCard postId={post.id} initialComments={initialComments} />
        </div>
      </div>
    </AnimatePresence>
  );
}
