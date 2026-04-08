"use client";

import { motion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";
import type { SourceRect, ExpandedPostData } from "./expansion-context";

// ~40% faster than the original (mass:2, stiffness:100, damping:16)
const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ExpandedCardProps {
  postData: ExpandedPostData;
  sourceRect: SourceRect | null;
  targetRect: Rect;
  closing: boolean;
}

export function ExpandedCard({
  postData,
  sourceRect,
  targetRect,
  closing,
}: ExpandedCardProps) {
  const authorName =
    postData.author?.full_name || postData.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = postData.body?.slice(0, 120) || postData.title;

  const hasSource = !!sourceRect;

  // When closing, animate back to source rect; otherwise animate to target
  const animateTo = closing && hasSource
    ? {
        top: sourceRect.top,
        left: sourceRect.left,
        width: sourceRect.width,
        height: sourceRect.height,
        borderRadius: 8,
        opacity: 1,
      }
    : {
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius: 16,
        opacity: 1,
      };

  return (
    <motion.div
      className="pointer-events-auto fixed flex flex-col gap-4 overflow-hidden will-change-[top,left,width,height]"
      initial={
        hasSource
          ? {
              top: sourceRect.top,
              left: sourceRect.left,
              width: sourceRect.width,
              height: sourceRect.height,
              borderRadius: 8,
              opacity: 1,
            }
          : {
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              borderRadius: 16,
              opacity: 0,
            }
      }
      animate={animateTo}
      transition={{
        default: EXPANSION_SPRING,
        opacity: { duration: 0.25, ease: "easeOut" },
      }}
    >
      {/* Image — flex-1 fills remaining space after caption */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
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
      </div>

      {/* Caption — moves with the container as part of the same FLIP */}
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
