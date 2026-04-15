"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { CursorCollapseIcon } from "@/components/expanded/cursor-collapse-icon";
import { useSearchPalette } from "./search-context";
import { useSearchPosts } from "@/hooks/use-search-posts";
import {
  useExpansion,
  type ExpandedPostData,
} from "@/components/expanded/expansion-context";
import { getAuthorColor } from "@/lib/utils";
import type { FeedPost } from "./experiment-card";

const SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

export function FeedSearchPalette() {
  const { isOpen, close } = useSearchPalette();
  const { expand } = useExpansion();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useSearchPosts(query);
  const results = data ?? [];

  // Autofocus input on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
      setFocused(false);
    }
  }, [isOpen]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // Window-level Escape — works even when input isn't focused
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  const handleSelect = useCallback(
    (post: FeedPost) => {
      close();
      const firstImage = post.assets?.find((a) =>
        a.mime_type?.startsWith("image/")
      );
      const data: ExpandedPostData = {
        id: post.id,
        title: post.title,
        body: post.body,
        created_at: post.created_at,
        author: post.author,
        imageUrl: firstImage?.signed_url ?? null,
        imageAspect:
          firstImage?.width && firstImage?.height
            ? firstImage.width / firstImage.height
            : 3 / 2,
        thumbHash: firstImage?.thumb_hash,
        dominantColor: firstImage?.dominant_color,
      };
      expand(data);
    },
    [close, expand]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(results[activeIndex]);
        return;
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const showPlaceholder = !focused && query.length === 0;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-40 outline-none ${!isOpen ? "pointer-events-none" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop — same hover-to-collapse treatment as other overlays */}
          <CursorCollapseIcon onDismiss={close}>
            <motion.div
              className="absolute inset-0 bg-[var(--page-bg)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.96 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
            />
          </CursorCollapseIcon>

          {/* Centered content column — pointer-events-none so backdrop hover reaches CursorCollapseIcon */}
          <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-6">
            {/* Input card */}
            <motion.div
              className="pointer-events-auto w-full max-w-[686px] rounded-2xl bg-white p-6"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={SPRING}
            >
              <div className="relative flex h-14 items-center overflow-hidden rounded-lg border border-[#dfe0e0] bg-[var(--page-bg)] px-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-label="Search for a work in progress"
                  aria-expanded={results.length > 0}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    results.length > 0
                      ? `search-result-${results[activeIndex]?.id}`
                      : undefined
                  }
                  role="combobox"
                  className="flex-1 bg-transparent font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)] focus:outline-none"
                />
                {/* Custom placeholder — fades out on focus */}
                <motion.span
                  className="pointer-events-none absolute left-4 font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-caption)]"
                  animate={{ opacity: showPlaceholder ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden
                >
                  Search for a work in progress
                </motion.span>
                <motion.span
                  className="pointer-events-none shrink-0 font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-caption)]"
                  animate={{ opacity: showPlaceholder ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden
                >
                  ⌘K
                </motion.span>
              </div>
            </motion.div>

            {/* Results card */}
            <AnimatePresence>
              {query.trim().length > 0 && results.length > 0 && (
                <motion.div
                  className="pointer-events-auto mt-2 w-full max-w-[686px] flex-col gap-2 rounded-2xl bg-white p-2"
                  role="listbox"
                  aria-label="Search results"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                >
                  {results.map((post, i) => {
                    const firstImage = post.assets?.find((a) =>
                      a.mime_type?.startsWith("image/")
                    );
                    const authorName =
                      post.author?.full_name ||
                      post.author?.email?.split("@")[0] ||
                      "Anonymous";
                    const badgeColor = getAuthorColor(authorName, post.author?.color);
                    const isActive = i === activeIndex;

                    return (
                      <div
                        key={post.id}
                        id={`search-result-${post.id}`}
                        role="option"
                        aria-selected={isActive}
                        className={`flex cursor-pointer items-center gap-3 p-2 rounded-lg transition-colors ${
                          isActive ? "bg-[#eceded]" : ""
                        }`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(post);
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative size-[52px] shrink-0 overflow-hidden rounded">
                          {firstImage?.signed_url ? (
                            <Image
                              src={firstImage.signed_url}
                              alt=""
                              fill
                              sizes="52px"
                              className="object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center font-heading text-sm text-[var(--page-bg)]"
                              style={{ backgroundColor: badgeColor }}
                            >
                              @{authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Title + author */}
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <span className="truncate font-heading text-lg font-bold leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)]">
                            {post.title}
                          </span>
                          <span className="font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-caption)]">
                            @{authorName.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty / loading states */}
            {query.trim().length > 0 && results.length === 0 && (
              <motion.div
                className="pointer-events-auto mt-2 w-full max-w-[686px] rounded-2xl bg-white p-6"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
              >
                <p className="text-center font-heading text-lg tracking-[-0.18px] text-[var(--text-caption)]">
                  {isFetching
                    ? "Searching…"
                    : `No matches for "${query.trim()}"`}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
