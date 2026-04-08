"use client";

import { motion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";
import type { SourceRect, ExpandedPostData } from "./expansion-context";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 2,
  stiffness: 100,
  damping: 16,
};

interface ExpandedCardProps {
  postData: ExpandedPostData;
  targetRect: TargetRect;
  sourceRect: SourceRect | null;
}

export function ExpandedCard({ postData, targetRect, sourceRect }: ExpandedCardProps) {
  const authorName =
    postData.author?.full_name || postData.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = postData.body?.slice(0, 120) || postData.title;

  const hasSource = !!sourceRect;

  return (
    <motion.div
      className="pointer-events-auto fixed flex flex-col gap-4 overflow-hidden"
      style={{ willChange: "top, left, width, height, border-radius" }}
      initial={
        hasSource
          ? {
              top: sourceRect.top,
              left: sourceRect.left,
              width: sourceRect.width,
              height: sourceRect.height,
              borderRadius: 8,
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
      animate={{
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius: 16,
        opacity: 1,
      }}
      exit={
        hasSource
          ? {
              top: sourceRect.top,
              left: sourceRect.left,
              width: sourceRect.width,
              height: sourceRect.height,
              borderRadius: 8,
              opacity: 0,
            }
          : {
              opacity: 0,
            }
      }
      transition={{
        default: EXPANSION_SPRING,
        opacity: { duration: 0.3, ease: "easeOut" },
      }}
    >
      {/* Image — fills all available space, resizes naturally with the container */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        {postData.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
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

      {/* Caption row */}
      <motion.div
        className="flex shrink-0 items-baseline gap-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...EXPANSION_SPRING, delay: 0.1 }}
      >
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
      </motion.div>
    </motion.div>
  );
}
