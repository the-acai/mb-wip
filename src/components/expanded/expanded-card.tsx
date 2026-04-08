"use client";

import { motion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";
import type { SourceRect, ExpandedPostData } from "./expansion-context";

const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 2,
  stiffness: 100,
  damping: 16,
};

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CaptionRect {
  top: number;
  left: number;
  width: number;
}

interface ExpandedCardProps {
  postData: ExpandedPostData;
  sourceRect: SourceRect | null;
  imageTargetRect: Rect;
  captionTargetRect: CaptionRect;
}

export function ExpandedCard({
  postData,
  sourceRect,
  imageTargetRect,
  captionTargetRect,
}: ExpandedCardProps) {
  const authorName =
    postData.author?.full_name || postData.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = postData.body?.slice(0, 120) || postData.title;

  const hasSource = !!sourceRect;

  return (
    <>
      {/* Image — FLIP from source rect to target rect */}
      <motion.div
        className="pointer-events-auto fixed overflow-hidden will-change-[top,left,width,height]"
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
                top: imageTargetRect.top,
                left: imageTargetRect.left,
                width: imageTargetRect.width,
                height: imageTargetRect.height,
                borderRadius: 16,
                opacity: 0,
              }
        }
        animate={{
          top: imageTargetRect.top,
          left: imageTargetRect.left,
          width: imageTargetRect.width,
          height: imageTargetRect.height,
          borderRadius: 16,
          opacity: 1,
        }}
        transition={{
          default: EXPANSION_SPRING,
          opacity: { duration: 0.25, ease: "easeOut" },
        }}
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

      {/* Caption — fades in at target position, independent of image FLIP */}
      <motion.div
        className="pointer-events-auto fixed flex items-baseline gap-2"
        style={{
          top: captionTargetRect.top,
          left: captionTargetRect.left,
          width: captionTargetRect.width,
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          ...EXPANSION_SPRING,
          delay: 0.12,
        }}
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
    </>
  );
}
