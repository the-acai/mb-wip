"use client";

import { motion, useReducedMotion } from "motion/react";
import { getAuthorColor, getAuthorName } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import { AuthorPill } from "@/components/shared/author-pill";
import { PostMedia } from "@/components/shared/post-media";
import type { ExpandedPostData } from "./expansion-context";

interface ExpandedCardProps {
  postData: ExpandedPostData;
  style: React.CSSProperties;
}

export function ExpandedCard({ postData, style }: ExpandedCardProps) {
  const reducedMotion = useReducedMotion();
  const authorName = getAuthorName(postData.author);
  const badgeColor = getAuthorColor(authorName, postData.author?.color);
  const caption = postData.body?.slice(0, 120) || postData.title;

  // layoutSource tells us which card to FLIP from. When absent (e.g. search
  // palette — no visible source card) we fade in instead.
  const hasFlipSource = !!postData.layoutSource;
  const flipProps = hasFlipSource
    ? {
        layoutId: postData.layoutSource,
        transition: { layout: SPRING.default },
      }
    : {
        initial: reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
        transition: reducedMotion ? { duration: 0 } : SPRING.default,
      };

  return (
    <motion.div
      {...flipProps}
      className="pointer-events-auto flex flex-col gap-4"
      style={{ position: "fixed", zIndex: 1, ...style }}
    >
      <PostMedia
        videoUrl={postData.videoUrl}
        thumbnailUrl={postData.imageUrl}
        videoPosterUrl={postData.videoPosterUrl}
        videoStartTime={postData.videoStartTime}
        thumbHash={postData.thumbHash}
        dominantColor={postData.dominantColor}
        alt={postData.title}
        imagePriority
        imageSizes="(max-width: 767px) 100vw, 40vw"
        imageClassName="transition-opacity duration-500 ease-out"
        containerClassName="min-h-0 flex-1"
      />

      {/* Caption */}
      <div className="flex shrink-0 items-baseline gap-2">
        <AuthorPill authorName={authorName} backgroundColor={badgeColor} />
        <p className="min-w-0 flex-1 text-heading-base text-[var(--text-caption)]">
          {caption}
        </p>
      </div>
    </motion.div>
  );
}
