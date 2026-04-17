"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MessageCircleIcon } from "lucide-react";

import { getAuthorColor, getAuthorName } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import { useExpansion, type ExpandedPostData } from "@/components/expanded/expansion-context";
import { AuthorPill } from "@/components/shared/author-pill";
import { PostMedia } from "@/components/shared/post-media";
import { type FeedVideoHandle } from "./feed-video";

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
    color: string | null;
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
    poster_path?: string | null;
    poster_signed_url?: string;
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
  // Fall back to video dimensions if no image
  if (!firstImage) {
    const firstVideo = post.assets?.find((a) => a.mime_type?.startsWith("video/"));
    if (firstVideo?.width && firstVideo?.height && firstVideo.height > firstVideo.width) {
      return "portrait";
    }
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
  const feedVideoRef = useRef<FeedVideoHandle>(null);
  const reducedMotion = useReducedMotion();
  const { expand, prefetchComments, postData } = useExpansion();

  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const firstVideoAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("video/")
  );
  const displayAsset = firstImageAsset || firstVideoAsset;
  const thumbnailUrl = firstImageAsset?.signed_url
    ?? firstVideoAsset?.poster_signed_url;
  const videoUrl = firstVideoAsset?.signed_url;
  const authorName = getAuthorName(post.author);
  const badgeColor = getAuthorColor(authorName, post.author?.color);
  const caption = post.body?.slice(0, 120) || post.title;
  const commentCount = post.comments?.[0]?.count ?? 0;

  const isPortrait = orientation === "portrait";

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
      videoUrl: videoUrl ?? null,
      videoPosterUrl: firstVideoAsset?.poster_signed_url ?? null,
      videoStartTime: feedVideoRef.current?.getCurrentTime(),
      imageAspect: orientation === "portrait" ? 2 / 3 : 3 / 2,
      layoutSource: `card-${post.id}`,
      thumbHash: displayAsset?.thumb_hash ?? undefined,
      dominantColor: displayAsset?.dominant_color ?? undefined,
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
      className="grid grid-rows-[subgrid]"
      style={{
        transformStyle: "preserve-3d",
        gridRow: isPortrait ? "span 4" : "span 2",
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
        className="group cursor-pointer !rounded-none !overflow-visible grid grid-rows-[subgrid]"
        style={{
          opacity: isLifted ? 0 : 1,
          gridRow: isPortrait ? "span 4" : "span 2",
        }}
        transition={{ layout: SPRING.default }}
      >
        <PostMedia
          videoUrl={videoUrl}
          thumbnailUrl={thumbnailUrl}
          videoPosterUrl={firstVideoAsset?.poster_signed_url}
          videoRef={feedVideoRef}
          thumbHash={displayAsset?.thumb_hash}
          dominantColor={displayAsset?.dominant_color}
          aspectRatio={isPortrait ? undefined : "3/2"}
          containerClassName={isPortrait ? "row-[span_3] min-h-0" : undefined}
          alt={post.title}
          imageClassName="transition-all duration-500 ease-out group-hover:scale-[1.02]"
        />

        <div className="flex items-baseline gap-2">
          <AuthorPill authorName={authorName} backgroundColor={badgeColor} />
          <p className="min-w-0 flex-1 text-heading-base text-[var(--text-caption)]">
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
      </motion.div>
    </motion.div>
  );
}
