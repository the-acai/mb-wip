"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

import { ExpandedCard } from "./expanded-card";
import { ExpandedCommentCard } from "./expanded-comment-card";
import { CursorCollapseIcon } from "./cursor-collapse-icon";

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

export function ExpandedPostOverlay({ post, initialComments }: ExpandedPostOverlayProps) {
  const router = useRouter();

  const dismiss = useCallback(() => {
    router.back();
  }, [router]);

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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
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

        {/* Content: two-column layout, vertically centered */}
        <div className="pointer-events-none relative flex h-full items-center justify-center gap-6 px-[8.33%]">
          {/* Expanded card — left side */}
          <div className="pointer-events-auto w-[38%] shrink-0">
            <ExpandedCard post={post} />
          </div>

          {/* Comment card — right side */}
          <div className="pointer-events-auto w-[40%] shrink-0">
            <ExpandedCommentCard postId={post.id} initialComments={initialComments} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
