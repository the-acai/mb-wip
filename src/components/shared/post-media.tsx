"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { thumbHashToPlaceholderURL } from "@/lib/thumb-hash";
import { FeedVideo, type FeedVideoHandle } from "@/components/feed/feed-video";

const PLACEHOLDER_BG = "#fff";

interface PostMediaProps {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  videoPosterUrl?: string | null;
  videoStartTime?: number;
  videoRef?: React.Ref<FeedVideoHandle>;
  thumbHash?: string | null;
  dominantColor?: string | null;
  /** CSS aspect-ratio value like "2/3" or "3/2". Omit if container is sized by flex. */
  aspectRatio?: string;
  alt?: string;
  imagePriority?: boolean;
  imageSizes?: string;
  /** Extra classes on the Image element (e.g. hover scale, transition type). */
  imageClassName?: string;
  /** Extra classes on the outer container (e.g. "min-h-0 flex-1" for the expanded card). */
  containerClassName?: string;
}

/**
 * Unified media block for post cards. Renders a three-way switch:
 * 1. Video (autoplay via FeedVideo)
 * 2. Image with progressive reveal (dominant color → ThumbHash blur → full image crossfade)
 * 3. "No image" fallback
 *
 * Manages its own `imageLoaded` state and `placeholderUrl` derivation.
 */
export function PostMedia({
  videoUrl,
  thumbnailUrl,
  videoPosterUrl,
  videoStartTime,
  videoRef,
  thumbHash,
  dominantColor,
  aspectRatio,
  alt = "",
  imagePriority,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw",
  imageClassName = "",
  containerClassName = "",
}: PostMediaProps) {
  const reducedMotion = useReducedMotion();
  const [imageLoaded, setImageLoaded] = useState(false);
  const placeholderUrl = useMemo(
    () => (thumbHash ? thumbHashToPlaceholderURL(thumbHash) : null),
    [thumbHash]
  );

  const bgColor = dominantColor || PLACEHOLDER_BG;

  if (videoUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg ${containerClassName}`}
        style={{ aspectRatio, backgroundColor: bgColor }}
      >
        <FeedVideo
          ref={videoRef}
          src={videoUrl}
          posterUrl={videoPosterUrl ?? undefined}
          startTime={videoStartTime}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  if (thumbnailUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg ${containerClassName}`}
        style={{ aspectRatio, backgroundColor: bgColor }}
      >
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
          src={thumbnailUrl}
          alt={alt}
          fill
          unoptimized
          priority={imagePriority}
          sizes={imageSizes}
          className={`object-cover ${
            reducedMotion || imageLoaded ? "opacity-100" : "opacity-0"
          } ${imageClassName}`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-lg bg-white text-[var(--text-caption)] ${containerClassName}`}
      style={{ aspectRatio }}
    >
      <span className="font-heading text-sm">No image</span>
    </div>
  );
}
