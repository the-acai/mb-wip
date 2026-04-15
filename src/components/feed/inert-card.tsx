"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { MessageCircleIcon } from "lucide-react";
import { getAuthorColor } from "@/lib/utils";
import { useExpansion, type ExpandedPostData } from "@/components/expanded/expansion-context";
import { type FeedPost, type Orientation } from "./experiment-card";
import { FeedVideo, type FeedVideoHandle } from "./feed-video";

const LAYOUT_SPRING = { type: "spring" as const, mass: 1.2, stiffness: 170, damping: 16 };

interface InertCardProps {
  post: FeedPost;
  orientation: Orientation;
}

/**
 * Visual clone of ExperimentCard for loop buffer zones.
 * Has its own layoutId (`buffer-{id}`) so the overlay can FLIP from the
 * clone's position instead of the off-screen original.
 */
export function InertCard({ post, orientation }: InertCardProps) {
  const preloaded = useRef(false);
  const feedVideoRef = useRef<FeedVideoHandle>(null);
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
  const authorName =
    post.author?.full_name || post.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName, post.author?.color);
  const caption = post.body?.slice(0, 120) || post.title;
  const commentCount = post.comments?.[0]?.count ?? 0;
  const aspectRatio = orientation === "portrait" ? "2/3" : "3/2";

  const layoutId = `buffer-${post.id}`;
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
      layoutSource: layoutId,
      thumbHash: displayAsset?.thumb_hash ?? undefined,
      dominantColor: displayAsset?.dominant_color ?? undefined,
    };
    expand(data);
  };

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
      layoutId={layoutId}
      onClick={handleClick}
      onMouseEnter={handlePreloadIntent}
      onPointerDown={handlePreloadIntent}
      className="group block cursor-pointer !rounded-none !overflow-visible"
      style={{ opacity: isLifted ? 0 : 1 }}
      transition={{ layout: LAYOUT_SPRING }}
    >
      <div className="flex flex-col gap-4">
        {videoUrl ? (
          <div
            className="relative overflow-hidden rounded-lg"
            style={{ aspectRatio, backgroundColor: displayAsset?.dominant_color || "#fff" }}
          >
            <FeedVideo
              ref={feedVideoRef}
              src={videoUrl}
              posterUrl={firstVideoAsset?.poster_signed_url}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : thumbnailUrl ? (
          <div
            className="relative overflow-hidden rounded-lg bg-white"
            style={{ aspectRatio }}
          >
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
  );
}
