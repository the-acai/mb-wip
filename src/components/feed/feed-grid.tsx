"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ExperimentCard,
  getPostOrientation,
  type FeedPost,
  type CardSpringConfig,
} from "./experiment-card";
import { SpringTuner, DEFAULT_SPRING, type SpringConfig } from "./spring-tuner";

function computeStaggerDelays(
  count: number,
  withinRowMs: number,
  rowBreathMs: number
): number[] {
  const COLS = 3;
  const delays: number[] = [];
  let time = 0;
  let colInRow = 0;

  for (let i = 0; i < count; i++) {
    delays.push(time / 1000);
    colInRow++;
    if (colInRow >= COLS) {
      colInRow = 0;
      time += withinRowMs + rowBreathMs;
    } else {
      time += withinRowMs;
    }
  }
  return delays;
}

interface FeedGridProps {
  posts: FeedPost[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "3/2" }} />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-5 flex-1 rounded" />
      </div>
    </div>
  );
}

export function FeedGrid({ posts, hasMore, loading, onLoadMore }: FeedGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [springConfig, setSpringConfig] = useState<SpringConfig>(DEFAULT_SPRING);
  const [replayKey, setReplayKey] = useState(0);

  const handleReplay = useCallback(() => {
    setReplayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" }
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

  if (posts.length === 0 && loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  const orientations = posts.map(getPostOrientation);
  const delays = computeStaggerDelays(
    posts.length,
    springConfig.withinRowMs,
    springConfig.rowBreathMs
  );

  const cardSpring: CardSpringConfig = {
    mass: springConfig.mass,
    stiffness: springConfig.stiffness,
    damping: springConfig.damping,
    y: springConfig.y,
    z: springConfig.z,
    scale: springConfig.scale,
    blur: springConfig.blur,
  };

  return (
    <>
      <div
        key={replayKey}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        style={{
          gridAutoFlow: "dense",
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        {posts.map((post, i) => {
          const orientation = orientations[i];
          const isPortrait = orientation === "portrait";
          return (
            <div
              key={post.id}
              style={{
                ...(isPortrait ? { gridRow: "span 2" } : {}),
                transformStyle: "preserve-3d",
              }}
            >
              <ExperimentCard
                post={post}
                orientation={orientation}
                delay={delays[i]}
                spring={cardSpring}
              />
            </div>
          );
        })}

        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`}>
              <CardSkeleton />
            </div>
          ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      <SpringTuner
        config={springConfig}
        onChange={setSpringConfig}
        onReplay={handleReplay}
      />
    </>
  );
}
