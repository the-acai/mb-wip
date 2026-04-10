"use client";

import { motion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";
import type { ExpandedPostData } from "./expansion-context";

const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

interface ExpandedCardProps {
  postData: ExpandedPostData;
  style: React.CSSProperties;
}

export function ExpandedCard({ postData, style }: ExpandedCardProps) {
  const authorName =
    postData.author?.full_name || postData.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = postData.body?.slice(0, 120) || postData.title;

  return (
    <motion.div
      layoutId={`card-${postData.id}`}
      className="pointer-events-auto flex flex-col gap-4 overflow-hidden"
      style={{ position: "fixed", zIndex: 1, borderRadius: 16, ...style }}
      transition={{ layout: EXPANSION_SPRING }}
    >
      {/* Image — flex-1 fills remaining space after caption */}
      <motion.div
        layoutId={`card-image-${postData.id}`}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
      >
        {postData.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={postData.imageUrl}
            alt={postData.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white text-[var(--text-caption)]">
            <span className="font-heading text-sm">No image</span>
          </div>
        )}
      </motion.div>

      {/* Caption */}
      <div className="flex shrink-0 items-baseline gap-2">
        <span
          className="flex h-8 shrink-0 items-center rounded-lg px-2"
          style={{ backgroundColor: badgeColor }}
        >
          <span className="font-heading text-base tracking-[-0.16px] text-[var(--page-bg)]">
            @{authorName.toLowerCase()}
          </span>
        </span>
        <p className="min-w-0 flex-1 font-heading text-base leading-[1.28] tracking-[-0.16px] text-[var(--text-caption)]">
          {caption}
        </p>
      </div>
    </motion.div>
  );
}
