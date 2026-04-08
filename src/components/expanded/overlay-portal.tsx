"use client";

import { useEffect } from "react";
import { useExpansion } from "./expansion-context";
import { ExpandedPostOverlay } from "./expanded-post-overlay";

export function OverlayPortal() {
  const { postData, clear } = useExpansion();

  // Close overlay on browser back/forward (fires after history.pushState)
  useEffect(() => {
    if (!postData) return;
    const handlePopState = () => clear();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [postData, clear]);

  if (!postData) return null;
  return <ExpandedPostOverlay />;
}
