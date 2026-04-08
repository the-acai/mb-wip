"use client";

import { useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ExperimentCard, type FeedPost } from "./experiment-card";

// TODO: Switch to actual image aspect ratio once width/height columns
// are added to the assets table. For now, use a deterministic hash to
// assign tall vs short cards for visual variety.
function getCardVariant(postId: string): "short" | "tall" {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  // ~30% of cards are tall
  return Math.abs(hash) % 10 < 3 ? "tall" : "short";
}

interface FeedGridProps {
  posts: FeedPost[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

function CardSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className={`flex flex-col gap-4 ${tall ? "row-span-2" : ""}`}>
      <Skeleton
        className={`w-full rounded-lg ${tall ? "flex-1 min-h-[300px]" : ""}`}
        style={!tall ? { aspectRatio: "933/632" } : undefined}
      />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-5 flex-1 rounded" />
      </div>
    </div>
  );
}

export function FeedGrid({ posts, hasMore, loading, onLoadMore }: FeedGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (posts.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-foreground">
          No experiments yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Be the first to share something.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        style={{ gridAutoRows: "minmax(200px, auto)", gridAutoFlow: "dense" }}
      >
        {posts.map((post) => (
          <ExperimentCard
            key={post.id}
            post={post}
            variant={getCardVariant(post.id)}
          />
        ))}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={`skeleton-${i}`} tall={i % 4 === 1} />
          ))}
      </div>

      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
