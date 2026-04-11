"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
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
  const topBufferRef = useRef<HTMLDivElement>(null);
  const isTeleportingRef = useRef(false);
  const initializedRef = useRef(false);

  // When the top buffer first appears, it pushes main content down.
  // Compensate scroll position so the user doesn't see a jump.
  useLayoutEffect(() => {
    if (!enabled || initializedRef.current) return;

    const topBuffer = topBufferRef.current;
    if (!topBuffer) return;

    const bufferHeight = topBuffer.getBoundingClientRect().height;
    window.scrollTo({ top: window.scrollY + bufferHeight, behavior: "instant" });
    initializedRef.current = true;
  }, [enabled]);

  // Reset initialized flag when disabled
  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
    }
  }, [enabled]);

  // Teleportation via window scroll (RAF-gated)
  const handleScroll = useCallback(() => {
    if (isTeleportingRef.current) return;

    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const mainRect = mainContent.getBoundingClientRect();
    const mainTop = mainRect.top + window.scrollY;
    const mainHeight = mainRect.height;
    const scrollY = window.scrollY;

    // DOWN: scrolled past bottom of main content → teleport up by mainHeight
    if (scrollY >= mainTop + mainHeight) {
      isTeleportingRef.current = true;
      window.scrollTo({ top: scrollY - mainHeight, behavior: "instant" });
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
      return;
    }

    // UP: scrolled into top buffer → teleport down by mainHeight
    if (scrollY < mainTop) {
      isTeleportingRef.current = true;
      window.scrollTo({ top: scrollY + mainHeight, behavior: "instant" });
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
      return;
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

  // Buffer posts: last N for top, first N for bottom
  const bufferCount = Math.min(posts.length, MAX_BUFFER_POSTS);
  const topBufferPosts = posts.slice(-bufferCount);
  const bottomBufferPosts = posts.slice(0, bufferCount);

  // Use keys so React preserves the main-content div when buffers appear/disappear.
  return (
    <>
      {enabled && (
        <BufferGrid
          key="top-buffer"
          ref={topBufferRef}
          posts={topBufferPosts}
          keyPrefix="top"
        />
      )}

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
          posts={bottomBufferPosts}
          keyPrefix="bottom"
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
}

const BufferGrid = forwardRef<HTMLDivElement, BufferGridProps>(
  function BufferGrid({ posts, keyPrefix }, ref) {
    return (
      <div
        ref={ref}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
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
