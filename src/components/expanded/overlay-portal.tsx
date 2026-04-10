"use client";

import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useExpansion } from "./expansion-context";
import { ExpandedPostOverlay } from "./expanded-post-overlay";

export function OverlayPortal() {
  const { postData, collapse } = useExpansion();

  // Back button: browser already reverted history, just clear state
  useEffect(() => {
    if (!postData) return;
    const handlePopState = () => collapse(true);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [postData, collapse]);

  return (
    <AnimatePresence>
      {postData && <ExpandedPostOverlay key={postData.id} />}
    </AnimatePresence>
  );
}
