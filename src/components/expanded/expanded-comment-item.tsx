"use client";

import { formatDistanceToNow } from "date-fns";
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

export function ExpandedCommentItem({ comment }: { comment: Comment }) {
  const authorName =
    comment.author.full_name || comment.author.email.split("@")[0] || "Anonymous";
  const color = getAuthorColor(authorName);
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: false,
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Author row */}
      <div className="flex items-center gap-3">
        {/* Profile color circle */}
        <div
          className="size-9 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {/* Name + time */}
        <div className="flex items-center gap-1 font-heading text-lg leading-[1.28] tracking-[-0.18px]">
          <span className="font-bold text-[var(--text-dark)]">
            @{authorName.toLowerCase()}
          </span>
          <span className="text-[var(--text-caption)]">
            {timeAgo === "less than a minute" ? "just now" : `${timeAgo} ago`}
          </span>
        </div>
      </div>

      {/* Comment body — indented past the profile circle */}
      <div className="pl-12">
        <p className="font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)]">
          {comment.body}
        </p>
      </div>
    </div>
  );
}
