"use client";

import Image from "next/image";
import Link from "next/link";
import { Images } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TAG_COLORS = [
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-lime-100 text-lime-700 border-lime-200",
];

function hashTagColor(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export interface FeedPost {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  author: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  assets: {
    id: string;
    file_path: string;
    mime_type: string;
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

interface ExperimentCardProps {
  post: FeedPost;
}

export function ExperimentCard({ post }: ExperimentCardProps) {
  const firstImageAsset = post.assets?.find((a) =>
    a.mime_type?.startsWith("image/")
  );
  const thumbnailUrl = firstImageAsset?.signed_url;
  const isGallery = post.assets?.length > 1;
  const authorName =
    post.author?.display_name || post.author?.username || "Anonymous";
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <Link href={`/post/${post.id}`} className="group block">
      <Card className="overflow-hidden border-0 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="relative">
            <Image
              src={thumbnailUrl}
              alt={post.title}
              width={400}
              height={300}
              className="w-full object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {isGallery && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Images className="size-3" />
                {post.assets.length}
              </span>
            )}
          </div>
        )}

        <CardContent className="flex flex-col gap-2 px-3 py-3">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {post.title}
          </h3>

          {/* Tags */}
          {post.post_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.post_tags.map((pt) => (
                <Badge
                  key={pt.tag.id}
                  className={cn(
                    "h-auto rounded-full border px-1.5 py-0 text-[10px] font-medium",
                    hashTagColor(pt.tag.name)
                  )}
                >
                  {pt.tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Author line */}
          <div className="flex items-center gap-2 pt-1">
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                backgroundColor: `hsl(${
                  (authorName.charCodeAt(0) * 37) % 360
                }, 60%, 55%)`,
              }}
            >
              {authorInitial}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{authorName}</span>
              {post.body && (
                <>
                  {" "}
                  &middot;{" "}
                  <span className="line-clamp-1 inline">
                    {post.body.slice(0, 80)}
                  </span>
                </>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
