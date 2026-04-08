"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { createComment } from "@/lib/queries/comments";
import { useRealtimeComments } from "@/hooks/use-realtime-comments";
import { useUser } from "@/hooks/use-user";
import { ExpandedCommentItem } from "./expanded-comment-item";
import { ExpandedCommentForm } from "./expanded-comment-form";
import { ThreadLine } from "./thread-line";
import { getAuthorColor } from "@/lib/utils";

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

const COMMENT_SPRING = {
  type: "spring" as const,
  mass: 2,
  stiffness: 100,
  damping: 16,
};

const STAGGER_MS = 80;

interface ExpandedCommentCardProps {
  postId: string;
  initialComments: Comment[];
}

export function ExpandedCommentCard({ postId, initialComments }: ExpandedCommentCardProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [submittingComment, setSubmittingComment] = useState<{
    body: string;
    authorName: string;
  } | null>(null);
  const supabase = createClient();
  const { user } = useUser();
  const commentListRef = useRef<HTMLDivElement>(null);

  // Sync when initialComments arrives asynchronously
  useEffect(() => {
    if (initialComments.length > 0) {
      setComments(initialComments);
    }
  }, [initialComments]);

  const handleInsert = useCallback((newComment: Record<string, unknown>) => {
    const comment = newComment as unknown as Comment;
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
    setSubmittingComment(null);
  }, []);

  const handleDelete = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  useRealtimeComments(postId, handleInsert, handleDelete);

  // Build flat comment list (top-level only for now, matching Figma design)
  const topLevel = comments.filter((c) => !c.parent_comment_id);

  const handleSubmit = async (body: string, parentId?: string) => {
    const authorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "you";
    setSubmittingComment({ body, authorName });

    await createComment(supabase, {
      post_id: postId,
      body,
      parent_comment_id: parentId,
    });
  };

  // Find parent comment by @mention
  const resolveParentFromMention = (body: string): { parentId?: string; cleanBody: string } => {
    const mentionMatch = body.match(/^@(\w+)\s/);
    if (!mentionMatch) return { cleanBody: body };

    const mentionedName = mentionMatch[1].toLowerCase();
    // Find most recent comment by that author
    const matchingComment = [...comments]
      .reverse()
      .find((c) => {
        const name = (c.author.full_name || c.author.email.split("@")[0]).toLowerCase();
        return name === mentionedName;
      });

    if (matchingComment) {
      return { parentId: matchingComment.id, cleanBody: body };
    }
    return { cleanBody: body };
  };

  const handleFormSubmit = async (body: string) => {
    const { parentId, cleanBody } = resolveParentFromMention(body);
    await handleSubmit(cleanBody, parentId);
  };

  // Compute thread line data — pairs of consecutive comments with their colors
  const getAuthorName = (c: Comment) =>
    c.author.full_name || c.author.email.split("@")[0] || "Anonymous";

  return (
    <motion.div
      className="flex max-h-[calc(100vh-120px)] flex-col gap-8 rounded-2xl bg-white p-6"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{
        ...COMMENT_SPRING,
        delay: 0.15,
      }}
    >
      {/* Comment list */}
      <div ref={commentListRef} className="relative flex flex-1 flex-col gap-8 overflow-y-auto">
        {topLevel.map((comment, i) => {
          const nextComment = topLevel[i + 1];
          const currentColor = getAuthorColor(getAuthorName(comment));
          const nextColor = nextComment
            ? getAuthorColor(getAuthorName(nextComment))
            : null;

          return (
            <motion.div
              key={comment.id}
              className="relative"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                ...COMMENT_SPRING,
                delay: 0.15 + (i * STAGGER_MS) / 1000,
              }}
            >
              <ExpandedCommentItem comment={comment} />
              {nextColor && (
                <ThreadLine colorTop={currentColor} colorBottom={nextColor} />
              )}
            </motion.div>
          );
        })}

        {/* Animating new comment */}
        <AnimatePresence>
          {submittingComment && (
            <motion.div
              className="relative"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={COMMENT_SPRING}
            >
              <ExpandedCommentItem
                comment={{
                  id: "pending",
                  post_id: postId,
                  author_id: user?.id || "",
                  parent_comment_id: null,
                  body: submittingComment.body,
                  created_at: new Date().toISOString(),
                  author: {
                    full_name: submittingComment.authorName,
                    email: user?.email || "",
                    avatar_url: null,
                  },
                  reactions: [],
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comment input */}
      <ExpandedCommentForm onSubmit={handleFormSubmit} />
    </motion.div>
  );
}
