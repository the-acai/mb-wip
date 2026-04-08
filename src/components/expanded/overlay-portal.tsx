"use client";

import { useEffect } from "react";
import { useExpansion } from "./expansion-context";
import { ExpandedPostOverlay } from "./expanded-post-overlay";

export function OverlayPortal() {
  const { postData, closing, startClose, clear } = useExpansion();

  // Back button: start close animation, then clear after it settles
  useEffect(() => {
    if (!postData) return;
    const handlePopState = () => {
      if (closing) return;
      startClose();
      // URL already changed via popstate, just need to clear after animation
      setTimeout(() => clear(), 500);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [postData, closing, startClose, clear]);

  if (!postData) return null;
  return <ExpandedPostOverlay />;
}
