"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { MessageCircleIcon } from "lucide-react";

import { getAuthorColor } from "@/lib/utils";
import { useExpansion, type ExpandedPostData } from "@/components/expanded/expansion-context";
import { thumbHashToPlaceholderURL } from "@/lib/thumb-hash";

export interface FeedPost {
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
    id: string;
    file_path: string;
    mime_type: string;
    width?: number | null;
    height?: number | null;
    signed_url?: string;
    thumb_hash?: string | null;
    dominant_color?: string | null;
  }[];
  post_tags: {
    tag: {
      id: string;
      name: string;
    };
  }[];
  comments: { count: number }[];
  reactions: { count: number }[];
}

export type Orientation = "landscape" | "portrait";

export function getPostOrientation(post: FeedPost): Orientation {
  const firstImage = post.assets?.find((a) => a.mime_type?.startsWith("image/"));
  if (firstImage?.width && firstImage?.height && firstImage.height > firstImage.width) {
    return "portrait";
  }
  return "landscape";
}

export interface CardSpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  y: number;
  z: number;
  scale: number;
  blur: number;
}

interface ExperimentCardProps {
  post: FeedPost;
  orientation: Orientation;
  /** Stagger delay in seconds */
  delay?: number;
  /** Spring config (passed from tuner or defaults) */
  spring?: CardSpringConfig;
}

const defaultSpring: CardSpringConfig = {
  mass: 1.2,
  stiffness: 140,
  damping: 18,
  y: 24,
  z: 80,
  scale: 1.06,
  blur: 0,
};

export function ExperimentCard({
  post,
  orientation,
  delay = 0,
  spring = defaultSpring,
}: ExperimentCardProps) {
  const preloaded = useRef(false);
  const reducedMotion = useReducedMotion();
  const { expand, prefetchComments, postData } = useExpansion();

  const [imageLoaded, setImageLoaded] = useState(false);

  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const thumbnailUrl = firstImageAsset?.signed_url;
  const thumbHash = firstImageAsset?.thumb_hash;
  const dominantColor = firstImageAsset?.dominant_color;
  const placeholderUrl = useMemo(
    () => (thumbHash ? thumbHashToPlaceholderURL(thumbHash) : null),
    [thumbHash]
  );
  const authorName =
    post.author?.full_name || post.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = post.body?.slice(0, 120) || post.title;
  const commentCount = post.comments?.[0]?.count ?? 0;

  const aspectRatio = orientation === "portrait" ? "2/3" : "3/2";

  // This card is currently expanded — hide it but keep its space
  const isLifted = postData?.id === post.id;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const data: ExpandedPostData = {
      id: post.id,
      title: post.title,
      body: post.body,
      created_at: post.created_at,
      author: post.author,
      imageUrl: thumbnailUrl ?? null,
      imageAspect: orientation === "portrait" ? 2 / 3 : 3 / 2,
      layoutSource: `card-${post.id}`,
      thumbHash,
      dominantColor,
    };
    expand(data);
  };

  // Preload image + comments on the earliest available signal of intent.
  // Desktop fires onMouseEnter on hover; touch devices don't, so we also
  // bind onPointerDown — preloaded ref guards against duplicate work.
  const handlePreloadIntent = () => {
    if (!preloaded.current) {
      preloaded.current = true;
      if (thumbnailUrl) {
        const img = new window.Image();
        img.src = thumbnailUrl;
      }
      prefetchComments(post.id);
    }
  };

  return (
    <motion.div
      onMouseEnter={handlePreloadIntent}
      onPointerDown={handlePreloadIntent}
      style={{
        transformStyle: "preserve-3d",
      }}
      initial={
        reducedMotion
          ? false
          : {
              opacity: 0,
              y: spring.y,
              z: spring.z,
              scale: spring.scale,
              filter: `blur(${spring.blur}px)`,
            }
      }
      whileInView={
        reducedMotion
          ? undefined
          : {
              opacity: 1,
              y: 0,
              z: 0,
              scale: 1,
              filter: "blur(0px)",
            }
      }
      viewport={{ once: true, margin: "0px 0px -300px 0px" }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              default: {
                type: "spring",
                mass: spring.mass,
                stiffness: spring.stiffness,
                damping: spring.damping,
                delay,
              },
              opacity: { duration: 0.4, ease: "easeOut", delay },
              filter: { duration: 0.6, ease: "easeOut", delay },
            }
      }
    >
      <motion.div
        layoutId={`card-${post.id}`}
        onClick={handleClick}
        className="group block cursor-pointer !rounded-none !overflow-visible"
        style={{ opacity: isLifted ? 0 : 1 }}
        transition={{ layout: { type: "spring", mass: 1.2, stiffness: 170, damping: 16 } }}
      >
        <div className="flex flex-col gap-4">
          {/* Image */}
          {thumbnailUrl ? (
            <div
              className="relative overflow-hidden rounded-lg"
              style={{ aspectRatio, backgroundColor: dominantColor || "#fff" }}
            >
              {/* ThumbHash blurry placeholder */}
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
                alt={post.title}
                fill
                className={`object-cover transition-all duration-500 ease-out group-hover:scale-[1.02] ${
                  reducedMotion || imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center overflow-hidden rounded-lg bg-white text-[var(--text-caption)]"
              style={{ aspectRatio }}
            >
              <span className="font-heading text-sm">No image</span>
            </div>
          )}

          {/* Caption row */}
          <div className="flex items-baseline gap-2">
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
            {commentCount > 0 && (
              <span
                className="inline-flex shrink-0 items-center gap-1 font-heading text-sm tracking-[-0.14px] text-[var(--text-caption)]"
                aria-label={`${commentCount} comment${commentCount === 1 ? "" : "s"}`}
              >
                <MessageCircleIcon className="size-3.5" aria-hidden="true" />
                {commentCount}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
