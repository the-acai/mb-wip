"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useExpansion } from "./expansion-context";
import { ExpandedPostOverlay } from "./expanded-post-overlay";

export function OverlayPortal() {
  const { postData, clear } = useExpansion();
  const pathname = usePathname();

  // Clear overlay when navigating away (e.g. browser back button)
  useEffect(() => {
    if (postData && !pathname.startsWith("/post/")) {
      clear();
    }
  }, [pathname, postData, clear]);

  if (!postData) return null;
  return <ExpandedPostOverlay />;
}
