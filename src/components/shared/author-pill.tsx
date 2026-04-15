"use client";

import { motion, type Transition } from "motion/react";

interface AuthorPillProps {
  authorName: string;
  backgroundColor: string;
  /** When provided, renders as a motion.span that participates in FLIP with this layoutId. */
  layoutId?: string;
  transition?: Transition;
}

const PILL_CLASS = "flex h-8 shrink-0 items-center rounded-lg pb-[0.2rem] px-2";

export function AuthorPill({
  authorName,
  backgroundColor,
  layoutId,
  transition,
}: AuthorPillProps) {
  const label = (
    <span className="font-heading text-base leading-none tracking-[-0.16px] text-[var(--page-bg)]">
      @{authorName.toLowerCase()}
    </span>
  );

  if (layoutId) {
    return (
      <motion.span
        layoutId={layoutId}
        transition={transition}
        className={PILL_CLASS}
        style={{ backgroundColor }}
      >
        {label}
      </motion.span>
    );
  }

  return (
    <span className={PILL_CLASS} style={{ backgroundColor }}>
      {label}
    </span>
  );
}
