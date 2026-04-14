"use client";

import { useRef } from "react";
import Image from "next/image";
import { MessageCircleIcon } from "lucide-react";
import { getAuthorColor } from "@/lib/utils";
import { useExpansion, type ExpandedPostData } from "@/components/expanded/expansion-context";
import { type FeedPost, type Orientation } from "./experiment-card";

interface InertCardProps {
  post: FeedPost;
  orientation: Orientation;
}

/**
 * Visual clone of ExperimentCard for loop buffer zones.
 * No Motion or layoutId (avoids FLIP conflicts with the real cards),
 * but clickable — calls expand() so posts in the buffer zone are interactive.
 */
export function InertCard({ post, orientation }: InertCardProps) {
  const preloaded = useRef(false);
  const { expand, prefetchComments } = useExpansion();

  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const thumbnailUrl = firstImageAsset?.signed_url;
  const authorName =
    post.author?.full_name || post.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = post.body?.slice(0, 120) || post.title;
  const commentCount = post.comments?.[0]?.count ?? 0;
  const aspectRatio = orientation === "portrait" ? "2/3" : "3/2";

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
      skipFlip: true,
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
    <div
      onClick={handleClick}
      onMouseEnter={handlePreloadIntent}
      onPointerDown={handlePreloadIntent}
      className="cursor-pointer"
      role="article"
    >
      <div className="group block">
        <div className="flex flex-col gap-4">
          {thumbnailUrl ? (
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
      </div>
    </div>
  );
}
