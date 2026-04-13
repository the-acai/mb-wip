"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createComment, deleteComment, updateComment } from "@/lib/queries/comments";
import { useRealtimeComments } from "@/hooks/use-realtime-comments";
import { useUser } from "@/hooks/use-user";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { Separator } from "@/components/ui/separator";

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

interface CommentThreadProps {
  postId: string;
  initialComments: Comment[];
}

export function CommentThread({ postId, initialComments }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const { user } = useUser();
  const supabase = createClient();

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

  // Build tree from flat list
  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_comment_id === parentId);

  const handleSubmit = async (body: string, parentId?: string) => {
    await createComment(supabase, {
      post_id: postId,
      body,
      parent_comment_id: parentId,
    });
    setReplyingTo(null);
  };

  const handleDeleteComment = async (id: string) => {
    await deleteComment(supabase, id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEditComment = async (id: string, body: string) => {
    const updated = (await updateComment(supabase, id, body)) as Comment;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const renderComment = (comment: Comment, depth: number) => (
    <div key={comment.id}>
      <CommentItem
        comment={comment}
        currentUserId={user?.id}
        depth={depth}
        onReply={() => setReplyingTo(comment.id)}
        onDelete={handleDeleteComment}
        onEdit={handleEditComment}
      />
      {replyingTo === comment.id && (
        <div className="ml-12 mb-2">
          <CommentForm
            onSubmit={(body) => handleSubmit(body, comment.id)}
            placeholder="Write a reply..."
            autoFocus
            onCancel={() => setReplyingTo(null)}
          />
        </div>
      )}
      {getReplies(comment.id).map((reply) => renderComment(reply, depth + 1))}
    </div>
  );

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h3>
      <Separator className="mb-2" />

      {topLevel.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <div className="divide-y">
          {topLevel.map((comment) => renderComment(comment, 0))}
        </div>
      )}

      <div className="mt-4">
        <CommentForm
          onSubmit={(body) => handleSubmit(body)}
          placeholder="Write a reply, or add to the conversation."
        />
      </div>
    </div>
  );
}
