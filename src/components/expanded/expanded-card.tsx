"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";
import type { SourceRect } from "./expansion-context";

interface PostData {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  assets: {
    file_path: string;
    mime_type: string;
    width?: number | null;
    height?: number | null;
    signed_url?: string;
  }[];
  post_tags: { tag: { id: string; name: string } }[];
}

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
  post: PostData;
  targetRect: TargetRect;
  sourceRect: SourceRect | null;
}

export function ExpandedCard({ post, targetRect, sourceRect }: ExpandedCardProps) {
  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const imageUrl = firstImageAsset?.signed_url;
  const authorName =
    post.author?.full_name || post.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = post.body?.slice(0, 120) || post.title;

  // Compute FLIP: transform that maps the target rect onto the source rect
  const hasSource = !!sourceRect;
  let initialX = 0,
    initialY = 0,
    initialScaleX = 1,
    initialScaleY = 1;

  if (hasSource) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;

    initialX = sourceCenterX - targetCenterX;
    initialY = sourceCenterY - targetCenterY;
    initialScaleX = sourceRect.width / targetRect.width;
    initialScaleY = sourceRect.height / targetRect.height;
  }

  return (
    <motion.div
      className="pointer-events-auto absolute flex flex-col gap-4 will-change-transform"
      style={{
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        transformOrigin: "center center",
      }}
      initial={
        hasSource
          ? {
              x: initialX,
              y: initialY,
              scaleX: initialScaleX,
              scaleY: initialScaleY,
              borderRadius: 8,
              opacity: 1,
            }
          : { opacity: 0, y: 40 }
      }
      animate={{
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        borderRadius: 16,
        opacity: 1,
      }}
      exit={
        hasSource
          ? {
              x: initialX,
              y: initialY,
              scaleX: initialScaleX,
              scaleY: initialScaleY,
              borderRadius: 8,
              opacity: 0,
            }
          : { opacity: 0, y: 40 }
      }
      transition={{
        default: EXPANSION_SPRING,
        opacity: { duration: 0.25, ease: "easeOut" },
      }}
    >
      {/* Image */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            sizes="38vw"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white text-[var(--text-caption)]">
            <span className="font-heading text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Caption row */}
      <motion.div
        className="flex items-baseline gap-2"
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
