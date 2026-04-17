"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { MessageCircleIcon } from "lucide-react";
import { getAuthorColor, getAuthorName } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import { useExpansion, type ExpandedPostData } from "@/components/expanded/expansion-context";
import { AuthorPill } from "@/components/shared/author-pill";
import { PostMedia } from "@/components/shared/post-media";
import { type FeedPost, type Orientation } from "./experiment-card";
import { type FeedVideoHandle } from "./feed-video";

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
  const authorName = getAuthorName(post.author);
  const badgeColor = getAuthorColor(authorName, post.author?.color);
  const caption = post.body?.slice(0, 120) || post.title;
  const commentCount = post.comments?.[0]?.count ?? 0;
  const isPortrait = orientation === "portrait";

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
        dominantColor={displayAsset?.dominant_color}
        aspectRatio={isPortrait ? undefined : "3/2"}
        containerClassName={isPortrait ? "row-[span_3] min-h-0" : undefined}
        imageClassName="transition-transform duration-300 group-hover:scale-[1.02]"
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
  );
}
