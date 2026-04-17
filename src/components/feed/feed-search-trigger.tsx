"use client";

import { motion } from "motion/react";
import { SearchIcon } from "lucide-react";
import { useSearchPalette } from "./search-context";
import { useUploadModal } from "@/components/upload/upload-modal-context";
import { SPRING } from "@/lib/motion";

// Hidden state tucks the search button behind the SEND IT pill so the
// reveal reads as "emerging out from under" send-it.
const HIDDEN_OFFSET_X = 32;
// Return delay so send-it's own collapse animation lands before search
// starts springing out from behind it.
const RETURN_DELAY_S = 0.45;

export function FeedSearchTrigger() {
  const { open } = useSearchPalette();
  const { isOpen: uploadOpen } = useUploadModal();

  return (
    <motion.button
      type="button"
      onClick={open}
      aria-label="Search experiments (⌘K)"
      aria-keyshortcuts="Meta+K Control+K"
      className={`relative z-[-1] flex size-12 cursor-pointer items-center justify-center rounded-full bg-[var(--text-dark)] ${
        uploadOpen ? "pointer-events-none" : "pointer-events-auto"
      }`}
      initial={{ opacity: 0, x: HIDDEN_OFFSET_X }}
      animate={uploadOpen ? "hidden" : "visible"}
      variants={{
        visible: { opacity: 1, x: 0 },
        hidden: { opacity: 0, x: HIDDEN_OFFSET_X },
      }}
      transition={{
        ...SPRING.default,
        delay: uploadOpen ? 0 : RETURN_DELAY_S,
      }}
      aria-hidden={uploadOpen}
    >
      <SearchIcon className="size-5 text-[var(--page-bg)]" aria-hidden="true" />
    </motion.button>
  );
}
