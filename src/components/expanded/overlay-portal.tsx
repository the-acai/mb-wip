"use client";

import { useEffect } from "react";
import { useExpansion } from "./expansion-context";
import { ExpandedPostOverlay } from "./expanded-post-overlay";

export function OverlayPortal() {
  const { postData, closing, startClose } = useExpansion();

  // Back button: start close animation (URL already reverted by browser)
  useEffect(() => {
    if (!postData) return;
    const handlePopState = () => {
      if (!closing) startClose(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [postData, closing, startClose]);

  if (!postData) return null;
  return <ExpandedPostOverlay />;
}
