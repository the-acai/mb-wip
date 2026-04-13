"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { createComment, deleteComment } from "@/lib/queries/comments";
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
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

const STAGGER_MS = 80;

interface ExpandedCommentCardProps {
  postId: string;
  initialComments: Comment[];
}

export function ExpandedCommentCard({ postId, initialComments }: ExpandedCommentCardProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
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
  }, []);

  const handleDelete = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  useRealtimeComments(postId, handleInsert, handleDelete);

  const topLevel = comments.filter((c) => !c.parent_comment_id);

  const handleSubmit = async (body: string, parentId?: string) => {
    await createComment(supabase, {
      post_id: postId,
      body,
      parent_comment_id: parentId,
    });
  };

  const resolveParentFromMention = (body: string): { parentId?: string; cleanBody: string } => {
    if (!body.startsWith("@")) return { cleanBody: body };

    // Build a set of known author display names from existing comments
    const authorNames = new Map<string, Comment>();
    for (const c of [...comments].reverse()) {
      const name = getAuthorName(c).toLowerCase();
      if (!authorNames.has(name)) {
        authorNames.set(name, c);
      }
    }

    // Check if the comment starts with @<known author name> (case-insensitive)
    const textAfterAt = body.slice(1).toLowerCase();
    for (const [name, comment] of authorNames) {
      if (textAfterAt.startsWith(name + " ") || textAfterAt === name) {
        return { parentId: comment.id, cleanBody: body };
      }
    }

    return { cleanBody: body };
  };

  const handleFormSubmit = async (body: string) => {
    const { parentId, cleanBody } = resolveParentFromMention(body);
    await handleSubmit(cleanBody, parentId);
  };

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      // Optimistic remove; realtime DELETE will confirm or correct.
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      try {
        await deleteComment(supabase, commentId);
      } catch (err) {
        // Reload from server on failure — simplest recovery
        console.error("Failed to delete comment", err);
      }
    },
    [supabase]
  );

  const getAuthorName = (c: Comment) =>
    c.author.full_name || c.author.email.split("@")[0] || "Anonymous";

  return (
    <motion.div
      className="flex max-h-[calc(100vh-120px)] flex-col rounded-2xl bg-white overflow-y-auto overflow-x-hidden"
      layout
      transition={COMMENT_SPRING}
    >
      {/* Comment list — no inner overflow so entrance animations clip at card edge */}
      <div ref={commentListRef} className="relative flex flex-col gap-8 p-6">
        {topLevel.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--text-caption)]">
            No comments yet. Be the first to reply.
          </p>
        )}
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
              layout
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                default: COMMENT_SPRING,
                layout: COMMENT_SPRING,
                delay: i * STAGGER_MS / 1000,
              }}
            >
              <ExpandedCommentItem
                comment={comment}
                currentUserId={user?.id}
                onDelete={handleDeleteComment}
              />
              {nextColor && (
                <ThreadLine
                  colorTop={currentColor}
                  colorBottom={nextColor}
                  delay={(i + 1) * STAGGER_MS / 1000 + 0.15}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Comment input — sticky so it stays visible when scrolling long threads */}
      <div className="sticky bottom-0 bg-white px-6 pb-6 pt-2">
        <ExpandedCommentForm onSubmit={handleFormSubmit} />
      </div>
    </motion.div>
  );
}
