"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";
import { thumbHashToPlaceholderURL } from "@/lib/thumb-hash";
import { FeedVideo } from "@/components/feed/feed-video";
import { AuthorPill } from "@/components/shared/author-pill";
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const placeholderUrl = useMemo(
    () => (postData.thumbHash ? thumbHashToPlaceholderURL(postData.thumbHash) : null),
    [postData.thumbHash]
  );
  const authorName =
    postData.author?.full_name || postData.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName, postData.author?.color);
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
      {/* Media — flex-1 fills remaining space after caption */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
        style={{ backgroundColor: postData.dominantColor || "#fff" }}
      >
        {postData.videoUrl ? (
          <FeedVideo
            src={postData.videoUrl}
            posterUrl={postData.videoPosterUrl ?? undefined}
            startTime={postData.videoStartTime}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : postData.imageUrl ? (
          <>
            {placeholderUrl && (
              <img
                src={placeholderUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out"
                style={{
                  filter: "blur(4px)",
                  transform: "scale(1.1)",
                  opacity: imageLoaded ? 0 : 1,
                }}
              />
            )}
            <Image
              src={postData.imageUrl}
              alt={postData.title}
              fill
              sizes="(max-width: 767px) 100vw, 40vw"
              className={`object-cover transition-opacity duration-500 ease-out ${
                reducedMotion || imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              priority
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-caption)]">
            <span className="font-heading text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="flex shrink-0 items-baseline gap-2">
        <AuthorPill authorName={authorName} backgroundColor={badgeColor} />
        <p className="min-w-0 flex-1 font-heading text-base leading-[1.28] tracking-[-0.16px] text-[var(--text-caption)]">
          {caption}
        </p>
      </div>
    </motion.div>
  );
}
