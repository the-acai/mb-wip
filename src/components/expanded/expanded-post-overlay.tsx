"use client";

import { useEffect, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

import { ExpandedCard } from "./expanded-card";
import { ExpandedCommentCard } from "./expanded-comment-card";
import { CursorCollapseIcon } from "./cursor-collapse-icon";
import { useExpansion } from "./expansion-context";
import { useIsMobile } from "@/hooks/use-media-query";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string; avatar_url: string | null; color: string | null };
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
  const isMobile = useIsMobile();
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

  // Scroll lock — unified across platforms.
  //
  // Body stays in normal flow (no position:fixed) so window.scrollY is
  // preserved and Motion's useScroll consumers (ShrinkingHeader etc.) don't
  // re-emit and reflow the background. We rely on `html { overflow: hidden }`
  // + `body { overflow: hidden }` + `body { overscroll-behavior: contain }`
  // to stop the page scrolling on every platform, and on the overlay's own
  // scroll containers having `overscroll-contain` to prevent rubber-band
  // chaining to body on iOS.
  //
  // Previously iOS used the position:fixed body lock to defeat momentum
  // scroll bleed (#45), but that pulled body out of html's flow which made
  // useScroll consumers see scrollY = 0 and morph the shrinking header /
  // headline behind the overlay. The combined overflow:hidden + overscroll
  // approach gets us the lock without that side effect on modern iOS.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPaddingRight: body.style.paddingRight,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.paddingRight = prev.bodyPaddingRight;
    };
  }, []);

  // Capture the trigger element so focus can be restored on close, and move
  // focus into the dialog once it mounts.
  //
  // Prefer an element marked with [data-overlay-autofocus] (the comment input)
  // so opening a card always lands focus in the reply box. Falls back to the
  // first focusable element, then the container itself.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (container) {
      const explicit = container.querySelector<HTMLElement>("[data-overlay-autofocus]");
      const focusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (explicit ?? focusable ?? container).focus({ preventScroll: true });
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
  const captionRowHeight = 48;

  // ─── Mobile: card on top, comments below, single vertical scroll ───
  // Matches the source card's containing padding (px-6 → 24px each side) so
  // the FLIP from grid → overlay stays the same width.
  const mobileMargin = 24;
  const mobileCardWidth = vw - mobileMargin * 2;
  const mobileImageHeight = mobileCardWidth / postData.imageAspect;
  const mobileCardHeight = mobileImageHeight + captionRowHeight;

  // ─── Desktop: card + comments side-by-side, vertically centered ───
  const desktopMargin = vw * 0.0833;
  const gap = 24;
  const cardWidth = vw * 0.38;
  const imageHeight = cardWidth / postData.imageAspect;
  const naturalCardHeight = imageHeight + captionRowHeight;
  const maxCardHeight = vh - 120;
  const totalCardHeight = Math.min(naturalCardHeight, maxCardHeight);
  const cardTop = (vh - totalCardHeight) / 2;
  const commentLeft = desktopMargin + cardWidth + gap;
  const commentWidth = vw * 0.40;
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

      {isMobile ? (
        /* Mobile: card on top, comments stacked below, outer scroll. */
        <div
          className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain"
          style={{ paddingTop: 24, paddingBottom: 32 }}
        >
          <div
            className="mx-auto flex flex-col gap-4"
            style={{ width: mobileCardWidth }}
          >
            <ExpandedCard
              postData={postData}
              style={{
                position: "relative",
                width: "100%",
                height: mobileCardHeight,
              }}
            />
            <motion.div
              initial={
                reducedMotion
                  ? { y: 0, opacity: 0 }
                  : { y: 20, opacity: 0 }
              }
              animate={{ y: 0, opacity: 1 }}
              exit={
                reducedMotion
                  ? { y: 0, opacity: 0 }
                  : { y: 20, opacity: 0 }
              }
              transition={{
                default: expansionTransition,
                opacity: reducedMotion
                  ? INSTANT_TRANSITION
                  : { duration: 0.25, ease: "easeOut" },
              }}
            >
              <ExpandedCommentCard
                postId={postData.id}
                initialComments={cachedComments as Comment[]}
                noMaxHeight
              />
            </motion.div>
          </div>
        </div>
      ) : (
        <>
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
            <ExpandedCommentCard
              postId={postData.id}
              initialComments={cachedComments as Comment[]}
            />
          </motion.div>

          {/* Expanded card — on top of comment card (higher z) */}
          <ExpandedCard
            postData={postData}
            style={{
              top: cardTop,
              left: desktopMargin,
              width: cardWidth,
              height: totalCardHeight,
            }}
          />
        </>
      )}
    </motion.div>
  );
}
