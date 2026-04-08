"use client";

import { useCallback } from "react";
import { VirtuosoGrid } from "react-virtuoso";

import { Skeleton } from "@/components/ui/skeleton";
import { ExperimentCard, type FeedPost } from "./experiment-card";

interface FeedGridProps {
  posts: FeedPost[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton
        className="w-full rounded-lg"
        style={{ aspectRatio: "933/632" }}
      />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-5 flex-1 rounded" />
      </div>
    </div>
  );
}

function LoadingFooter() {
  return (
    <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={`skeleton-${i}`} />
      ))}
    </div>
  );
}

export function FeedGrid({ posts, hasMore, loading, onLoadMore }: FeedGridProps) {
  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

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

  if (posts.length === 0 && loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <VirtuosoGrid
      useWindowScroll
      data={posts}
      endReached={handleEndReached}
      increaseViewportBy={400}
      overscan={200}
      listClassName="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      itemClassName=""
      itemContent={(index, post) => (
        <ExperimentCard key={post.id} post={post} />
      )}
      computeItemKey={(index, post) => post.id}
      components={{
        Footer: loading ? LoadingFooter : undefined,
      }}
    />
  );
}
