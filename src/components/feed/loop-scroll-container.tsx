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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topBufferRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isTeleportingRef = useRef(false);
  const scrollOffsetRef = useRef(0); // scroll position relative to main content top
  const initializedRef = useRef(false);

  // Lock body scroll when loop is active
  useLayoutEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [enabled]);

  // Set initial scroll position on activation; restore on posts change
  useLayoutEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    const topBuffer = topBufferRef.current;
    if (!container || !topBuffer) return;

    if (!initializedRef.current) {
      // First activation: position at start of main content
      container.scrollTop = topBuffer.offsetHeight;
      scrollOffsetRef.current = 0;
      initializedRef.current = true;
    } else {
      // Posts changed (pagination): restore relative position
      container.scrollTop = topBuffer.offsetHeight + scrollOffsetRef.current;
    }
  }, [enabled, posts.length]);

  // Teleportation logic (RAF-gated)
  const handleScroll = useCallback(() => {
    if (isTeleportingRef.current) return;

    const container = scrollContainerRef.current;
    const mainContent = mainContentRef.current;
    const topBuffer = topBufferRef.current;
    if (!container || !mainContent || !topBuffer) return;

    const mainHeight = mainContent.offsetHeight;
    const bufferHeight = topBuffer.offsetHeight;
    const { scrollTop, clientHeight } = container;

    // Track position relative to main content top
    scrollOffsetRef.current = scrollTop - bufferHeight;

    // Scrolled past bottom of main content → teleport up
    if (scrollTop >= bufferHeight + mainHeight) {
      isTeleportingRef.current = true;
      container.scrollTop = scrollTop - mainHeight;
      scrollOffsetRef.current = container.scrollTop - bufferHeight;
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
      return;
    }

    // Scrolled above top of main content minus one viewport → teleport down
    if (scrollTop < bufferHeight - clientHeight) {
      isTeleportingRef.current = true;
      container.scrollTop = scrollTop + mainHeight;
      scrollOffsetRef.current = container.scrollTop - bufferHeight;
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
      return;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [enabled, handleScroll]);

  // Buffer posts: last N for top, first N for bottom
  const bufferCount = Math.min(posts.length, MAX_BUFFER_POSTS);
  const topBufferPosts = posts.slice(-bufferCount);
  const bottomBufferPosts = posts.slice(0, bufferCount);

  // Always render the same tree structure to prevent FeedGrid re-mounting.
  // Use keys so React preserves the main-content div across enabled transitions.
  return (
    <div
      ref={scrollContainerRef}
      className={
        enabled
          ? "fixed inset-0 z-30 space-y-6 overflow-y-auto bg-[var(--page-bg)] px-6 pb-[calc(64px+4rem)]"
          : ""
      }
      style={enabled ? { overscrollBehavior: "contain" } : undefined}
    >
      {enabled && (
        <BufferGrid
          key="top-buffer"
          ref={topBufferRef}
          posts={topBufferPosts}
          keyPrefix="top"
        />
      )}

      <div key="main-content" ref={mainContentRef} role={enabled ? "feed" : undefined} aria-label={enabled ? "Project feed" : undefined}>
        {children}
      </div>

      {enabled && (
        <BufferGrid
          key="bottom-buffer"
          posts={bottomBufferPosts}
          keyPrefix="bottom"
        />
      )}
    </div>
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
