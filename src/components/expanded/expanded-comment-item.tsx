"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2Icon, CornerDownRightIcon, PencilIcon } from "lucide-react";
import { getAuthorColor } from "@/lib/utils";

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string; avatar_url: string | null; color: string | null };
  reactions: { emoji: string; user_id: string }[];
}

interface ExpandedCommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
  onReply?: () => void;
  onEdit?: (commentId: string, body: string) => Promise<void>;
}

export function ExpandedCommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onEdit,
}: ExpandedCommentItemProps) {
  const authorName =
    comment.author.full_name || comment.author.email.split("@")[0] || "Anonymous";
  const color = getAuthorColor(authorName, comment.author?.color);
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: false,
  });
  const isOwn = !!currentUserId && currentUserId === comment.author_id;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  const handleDelete = () => {
    if (!onDelete) return;
    if (!window.confirm("Delete this comment?")) return;
    onDelete(comment.id);
  };

  const startEdit = () => {
    setDraft(comment.body);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(comment.body);
  };

  const saveEdit = async () => {
    if (!onEdit) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === comment.body || saving) return;
    setSaving(true);
    try {
      await onEdit(comment.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group flex flex-col gap-3">
      {/* Author row */}
      <div className="flex items-center gap-3">
        {/* Profile color circle */}
        <div
          className="size-9 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          data-reply-avatar={comment.id}
        />
        {/* Name + time */}
        <div className="flex flex-1 items-center gap-1 font-heading text-lg leading-[1.28] tracking-[-0.18px]">
          <span className="font-bold text-[var(--text-dark)]">
            @{authorName.toLowerCase()}
          </span>
          <span className="text-[var(--text-caption)]">
            {timeAgo === "less than a minute" ? "just now" : `${timeAgo} ago`}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {onReply && !editing && (
            <button
              type="button"
              onClick={onReply}
              aria-label={`Reply to @${authorName.toLowerCase()}`}
              className="text-[var(--text-caption)] hover:text-[var(--text-dark)]"
            >
              <CornerDownRightIcon className="size-4" aria-hidden="true" />
            </button>
          )}
          {isOwn && onEdit && !editing && (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit comment"
              className="text-[var(--text-caption)] hover:text-[var(--text-dark)]"
            >
              <PencilIcon className="size-4" aria-hidden="true" />
            </button>
          )}
          {isOwn && onDelete && !editing && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete comment"
              className="text-[var(--text-caption)] hover:text-destructive"
            >
              <Trash2Icon className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Comment body — indented past the profile circle */}
      <div className="pl-12">
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={3}
              aria-label="Edit comment"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void saveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelEdit();
                }
              }}
              className="w-full resize-y rounded-lg border border-[#dfe0e0] bg-[var(--page-bg)] px-3 py-2 font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={saveEdit}
                disabled={
                  saving ||
                  draft.trim().length === 0 ||
                  draft.trim() === comment.body
                }
                className="rounded-full bg-[var(--text-dark)] px-3 py-1 font-heading text-[var(--page-bg)] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="font-heading text-[var(--text-caption)] hover:text-[var(--text-dark)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)]">
            {comment.body}
          </p>
        )}
      </div>
    </div>
  );
}
