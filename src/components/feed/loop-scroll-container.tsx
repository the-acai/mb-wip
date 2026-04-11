"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  type ReactNode,
} from "react";
import { InertCard } from "./inert-card";
import { type FeedPost, getPostOrientation } from "./experiment-card";

const MAX_BUFFER_POSTS = 20;

interface LoopScrollContainerProps {
  posts: FeedPost[];
  enabled: boolean;
  children: ReactNode;
}

export function LoopScrollContainer({
  posts,
  enabled,
  children,
}: LoopScrollContainerProps) {
  const mainContentRef = useRef<HTMLDivElement>(null);
  const bottomBufferRef = useRef<HTMLDivElement>(null);
  const isTeleportingRef = useRef(false);

  // Toggle scrollbar visibility
  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("loop-active");
    return () => {
      document.documentElement.classList.remove("loop-active");
    };
  }, [enabled]);

  // Teleportation via window scroll (RAF-gated)
  const handleScroll = useCallback(() => {
    if (isTeleportingRef.current) return;

    const mainContent = mainContentRef.current;
    const bottomBuffer = bottomBufferRef.current;
    if (!mainContent || !bottomBuffer) return;

    const scrollY = window.scrollY;
    const mainTop = mainContent.getBoundingClientRect().top + scrollY;
    const bottomBufferTop = bottomBuffer.getBoundingClientRect().top + scrollY;

    // cycleLength = distance from main content start to bottom buffer start.
    // Teleporting by this distance maps bottom-buffer content to the
    // visually identical position at the start of main content.
    const cycleLength = bottomBufferTop - mainTop;

    // Scrolled into the bottom buffer → teleport up to main content
    if (scrollY >= bottomBufferTop) {
      isTeleportingRef.current = true;
      window.scrollTo(0, scrollY - cycleLength);
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [enabled, handleScroll]);

  // Buffer: first N posts (matches start of main content for seamless wrap)
  const bufferCount = Math.min(posts.length, MAX_BUFFER_POSTS);
  const bottomBufferPosts = posts.slice(0, bufferCount);

  return (
    <>
      <div
        key="main-content"
        ref={mainContentRef}
        role={enabled ? "feed" : undefined}
        aria-label={enabled ? "Project feed" : undefined}
      >
        {children}
      </div>

      {enabled && (
        <BufferGrid
          key="bottom-buffer"
          ref={bottomBufferRef}
          posts={bottomBufferPosts}
          keyPrefix="bottom"
          className="mt-6"
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------
// Buffer grid — matches FeedGrid's layout without Motion or interactivity
// ------------------------------------------------------------------

interface BufferGridProps {
  posts: FeedPost[];
  keyPrefix: string;
  className?: string;
}

const BufferGrid = forwardRef<HTMLDivElement, BufferGridProps>(
  function BufferGrid({ posts, keyPrefix, className }, ref) {
    return (
      <div
        ref={ref}
        className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3${className ? ` ${className}` : ""}`}
        style={{ gridAutoFlow: "dense", perspective: "1000px" }}
      >
        {posts.map((post) => {
          const orientation = getPostOrientation(post);
          const isPortrait = orientation === "portrait";
          return (
            <div
              key={`${keyPrefix}-${post.id}`}
              style={isPortrait ? { gridRow: "span 2" } : undefined}
            >
              <InertCard post={post} orientation={orientation} />
            </div>
          );
        })}
      </div>
    );
  }
);
