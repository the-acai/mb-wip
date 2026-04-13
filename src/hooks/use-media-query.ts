"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. SSR-safe — defaults to false on the server
 * and on the very first client render, then re-evaluates after mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    list.addEventListener("change", handler);
    return () => list.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** True on viewports below the Tailwind `md` breakpoint (768px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
