"use client";

import { motion } from "motion/react";
import { SearchIcon } from "lucide-react";
import { useSearchPalette } from "./search-context";
import { SPRING } from "@/lib/motion";

export function FeedSearchTrigger() {
  const { open } = useSearchPalette();

  return (
    <motion.button
      type="button"
      onClick={open}
      aria-label="Search experiments (⌘K)"
      aria-keyshortcuts="Meta+K Control+K"
      className="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full bg-[var(--text-dark)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.default}
    >
      <SearchIcon className="size-5 text-[var(--page-bg)]" aria-hidden="true" />
    </motion.button>
  );
}
