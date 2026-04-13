"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-red-500",
  "bg-indigo-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface CommentItemProps {
  comment: {
    id: string;
    author_id: string;
    body: string;
    created_at: string;
    author: { full_name: string | null; email: string; avatar_url: string | null };
    reactions?: { emoji: string; user_id: string }[];
  };
  currentUserId?: string;
  onReply?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, body: string) => Promise<void>;
  depth?: number;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
  depth = 0,
}: CommentItemProps) {
  const authorName = comment.author.full_name || comment.author.email.split("@")[0];
  const isOwn = !!currentUserId && currentUserId === comment.author_id;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: false });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);

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
    <div className={cn("flex gap-3 py-3", depth > 0 && "ml-8")}>
      <div
        className={cn(
          "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium text-white",
          getAvatarColor(authorName)
        )}
      >
        {authorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">{timeAgo} ago</span>
        </div>
        {editing ? (
          <div className="mt-1 flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={3}
              aria-label="Edit comment"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void saveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={
                  saving ||
                  draft.trim().length === 0 ||
                  draft.trim() === comment.body
                }
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-foreground/90">{comment.body}</p>
        )}
        {!editing && (
          <div className="mt-1 flex items-center gap-2">
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={onReply}
              >
                Reply
              </Button>
            )}
            {isOwn && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={startEdit}
              >
                Edit
              </Button>
            )}
            {isOwn && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
