"use client";

import { useEffect, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

import { ExpandedCard } from "./expanded-card";
import { ExpandedCommentCard } from "./expanded-comment-card";
import { CursorCollapseIcon } from "./cursor-collapse-icon";
import { useExpansion } from "./expansion-context";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string; avatar_url: string | null };
  reactions: { emoji: string; user_id: string }[];
}

// Same spring as the card expansion
const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

const INSTANT_TRANSITION = { duration: 0 };

export function ExpandedPostOverlay() {
  const { postData, commentCache, prefetchComments, collapse } = useExpansion();
  const reducedMotion = useReducedMotion();
  const expansionTransition = reducedMotion ? INSTANT_TRANSITION : EXPANSION_SPRING;

  const containerRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Read from cache, trigger fetch if miss
  const cachedComments = postData ? (commentCache.get(postData.id) ?? []) : [];
  useEffect(() => {
    if (postData && !commentCache.has(postData.id)) {
      prefetchComments(postData.id);
    }
  }, [postData, commentCache, prefetchComments]);

  const dismiss = useCallback(() => {
    collapse();
  }, [collapse]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dismiss]);

  // Scroll lock — uses the position:fixed body-lock pattern instead of
  // overflow:hidden. iOS Safari ignores overflow:hidden on the body and lets
  // momentum scroll bleed through; pinning the body in place with a negative
  // top offset is the only reliable cross-platform lock.
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      // Restore scroll without smooth-scroll behavior
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Capture the trigger element so focus can be restored on close, and move
  // focus into the dialog once it mounts.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? container).focus({ preventScroll: true });
    }
    return () => {
      restoreFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, []);

  // Tab key focus trap — keep focus within the dialog while it's open.
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  if (!postData) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = vw * 0.0833;
  const gap = 24;
  const captionRowHeight = 48;

  // Card target sized to preserve image aspect ratio
  const cardWidth = vw * 0.38;
  const imageHeight = cardWidth / postData.imageAspect;
  const naturalCardHeight = imageHeight + captionRowHeight;
  const maxCardHeight = vh - 120;
  const totalCardHeight = Math.min(naturalCardHeight, maxCardHeight);
  const cardTop = (vh - totalCardHeight) / 2;

  // Comment panel position
  const commentLeft = margin + cardWidth + gap;
  const commentWidth = vw * 0.40;

  // Comment card starts fully behind the experiment card's right edge
  const commentSlideX = -(gap + commentWidth);

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={postData.title ?? "Expanded post"}
      tabIndex={-1}
      className="fixed inset-0 z-40 outline-none"
      exit={{ opacity: 0 }}
      transition={reducedMotion ? INSTANT_TRANSITION : { duration: 0.2 }}
    >
      {/* Backdrop */}
      <CursorCollapseIcon onDismiss={dismiss}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          variants={{
            hidden: {
              opacity: 0,
              transition: reducedMotion
                ? INSTANT_TRANSITION
                : { duration: 0.2, ease: "easeOut" },
            },
            visible: { opacity: 0.96, transition: expansionTransition },
          }}
          initial="hidden"
          animate="visible"
          exit="hidden"
        />
      </CursorCollapseIcon>

      {/* Comment card — slides from behind experiment card (lower z) */}
      <motion.div
        className="pointer-events-auto absolute"
        style={{
          top: cardTop,
          left: commentLeft,
          width: commentWidth,
          maxHeight: totalCardHeight,
          zIndex: 0,
        }}
        initial={
          reducedMotion
            ? { x: 0, scale: 1, opacity: 0 }
            : { x: commentSlideX, scale: 0.96, opacity: 0 }
        }
        animate={{ x: 0, scale: 1, opacity: 1 }}
        exit={
          reducedMotion
            ? { x: 0, scale: 1, opacity: 0 }
            : { x: commentSlideX, scale: 0.96, opacity: 0 }
        }
        transition={{
          default: expansionTransition,
          opacity: reducedMotion
            ? INSTANT_TRANSITION
            : { duration: 0.25, ease: "easeOut" },
        }}
      >
        <ExpandedCommentCard postId={postData.id} initialComments={cachedComments as Comment[]} />
      </motion.div>

      {/* Expanded card — on top of comment card (higher z) */}
      <ExpandedCard
        postData={postData}
        style={{
          top: cardTop,
          left: margin,
          width: cardWidth,
          height: totalCardHeight,
        }}
      />
    </motion.div>
  );
}
