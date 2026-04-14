"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
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
  const reducedMotion = useReducedMotion();
  const authorName =
    postData.author?.full_name || postData.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = postData.body?.slice(0, 120) || postData.title;

  // layoutSource tells us which card to FLIP from. When absent (e.g. search
  // palette — no visible source card) we fade in instead.
  const hasFlipSource = !!postData.layoutSource;
  const flipProps = hasFlipSource
    ? {
        layoutId: postData.layoutSource,
        transition: { layout: EXPANSION_SPRING },
      }
    : {
        initial: reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
        transition: reducedMotion ? { duration: 0 } : EXPANSION_SPRING,
      };

  return (
    <motion.div
      {...flipProps}
      className="pointer-events-auto flex flex-col gap-4"
      style={{ position: "fixed", zIndex: 1, ...style }}
    >
      {/* Image — flex-1 fills remaining space after caption */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
        {postData.imageUrl ? (
          <Image
            src={postData.imageUrl}
            alt={postData.title}
            fill
            sizes="(max-width: 767px) 100vw, 40vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white text-[var(--text-caption)]">
            <span className="font-heading text-sm">No image</span>
          </div>
        )}
      </div>

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
