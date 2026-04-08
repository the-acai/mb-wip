"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { getAuthorColor } from "@/lib/utils";

interface PostData {
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
    file_path: string;
    mime_type: string;
    width?: number | null;
    height?: number | null;
    signed_url?: string;
  }[];
  post_tags: { tag: { id: string; name: string } }[];
}

const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 2,
  stiffness: 100,
  damping: 16,
};

export function ExpandedCard({ post }: { post: PostData }) {
  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const imageUrl = firstImageAsset?.signed_url;
  const authorName =
    post.author?.full_name || post.author?.email?.split("@")[0] || "Anonymous";
  const badgeColor = getAuthorColor(authorName);
  const caption = post.body?.slice(0, 120) || post.title;

  return (
    <motion.div
      className="flex h-[calc(100vh-120px)] max-h-[1020px] flex-col gap-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={EXPANSION_SPRING}
    >
      {/* Image */}
      <motion.div
        layoutId={`card-image-${post.id}`}
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl"
        transition={EXPANSION_SPRING}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            sizes="38vw"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white text-[var(--text-caption)]">
            <span className="font-heading text-sm">No image</span>
          </div>
        )}
      </motion.div>

      {/* Caption row */}
      <motion.div
        layoutId={`card-caption-${post.id}`}
        className="flex items-baseline gap-2"
        transition={EXPANSION_SPRING}
      >
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
      </motion.div>
    </motion.div>
  );
}
