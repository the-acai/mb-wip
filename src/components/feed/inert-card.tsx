"use client";

import Image from "next/image";
import { getAuthorColor } from "@/lib/utils";
import { type FeedPost, type Orientation } from "./experiment-card";

interface InertCardProps {
  post: FeedPost;
  orientation: Orientation;
}

/**
 * Non-interactive visual clone of ExperimentCard.
 * Used in loop buffer zones — no Motion, no layoutId, no click handlers.
 */
export function InertCard({ post, orientation }: InertCardProps) {
  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const thumbnailUrl = firstImageAsset?.signed_url;
  const authorName =
    post.author?.full_name || post.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = post.body?.slice(0, 120) || post.title;
  const aspectRatio = orientation === "portrait" ? "2/3" : "3/2";

  return (
    <div aria-hidden="true">
      <div className="block">
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
                className="object-cover"
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
          </div>
        </div>
      </div>
    </div>
  );
}
