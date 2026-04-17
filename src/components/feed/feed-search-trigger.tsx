"use client";

import { motion } from "motion/react";
import { SearchIcon } from "lucide-react";
import { useSearchPalette } from "./search-context";
import { useUploadModal } from "@/components/upload/upload-modal-context";
import { getSearchTriggerState } from "@/components/upload/upload-modal-state";
import { SPRING } from "@/lib/motion";

// Hidden state tucks the search button behind the SEND IT pill so the
// reveal reads as "emerging out from under" send-it.
const HIDDEN_OFFSET_X = 32;

export function FeedSearchTrigger() {
  const { open } = useSearchPalette();
  const { isOpen, isReturningEarly } = useUploadModal();
  const triggerState = getSearchTriggerState({ isOpen, isReturningEarly });

  return (
    <motion.button
      type="button"
      onClick={triggerState.interactive ? open : undefined}
      aria-label="Search experiments (⌘K)"
      aria-keyshortcuts="Meta+K Control+K"
      className={`relative z-[-1] flex size-12 cursor-pointer items-center justify-center rounded-full bg-[var(--text-dark)] ${
        triggerState.interactive ? "pointer-events-auto" : "pointer-events-none"
      }`}
      tabIndex={triggerState.interactive ? 0 : -1}
      initial={{ opacity: 0, x: HIDDEN_OFFSET_X }}
      animate={triggerState.visible ? "visible" : "hidden"}
      variants={{
        visible: { opacity: 1, x: 0 },
        hidden: { opacity: 0, x: HIDDEN_OFFSET_X },
      }}
      transition={SPRING.default}
      aria-hidden={triggerState.ariaHidden}
    >
      <SearchIcon className="size-5 text-[var(--page-bg)]" aria-hidden="true" />
    </motion.button>
  );
}
