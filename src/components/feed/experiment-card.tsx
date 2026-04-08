"use client";

import Image from "next/image";
import Link from "next/link";

import { getAuthorColor } from "@/lib/utils";

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

interface ExperimentCardProps {
  post: FeedPost;
  orientation: Orientation;
}

export function ExperimentCard({ post, orientation }: ExperimentCardProps) {
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
    <Link href={`/post/${post.id}`} className="group block">
      <div className="flex flex-col gap-4">
        {/* Image */}
        {thumbnailUrl ? (
          <div
            className="relative overflow-hidden rounded-lg bg-white"
            style={{ aspectRatio }}
          >
            <Image
              src={thumbnailUrl}
              alt={post.title}
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
        </div>
      </div>
    </Link>
  );
}
