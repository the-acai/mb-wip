import { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, useReducedMotion } from "motion/react";

const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

/**
 * Scroll-linked card reveal with mount-entrance fallback.
 *
 * Cards below the viewport at page load get scroll-linked opacity/y/scale
 * transforms driven by their scroll position. Cards already visible at
 * page load can't scroll-link (there's nothing to scroll yet), so they
 * fall back to a mount entrance via Motion's initial/animate.
 *
 * `scrollLinked` tells the consumer which path to use.
 */
export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const revealedRef = useRef(false);
  // Start false — all cards render with initial={{ opacity: 0 }}.
  // After mount, below-fold cards flip to true and switch to scroll-linked style.
  const [scrollLinked, setScrollLinked] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end 0.8"],
  });

  // After mount (once useScroll has measured the real position),
  // decide which animation path this card takes.
  useEffect(() => {
    const v = scrollYProgress.get();
    if (v < 0.8) {
      // Below fold — hand off to scroll-linked transforms
      setScrollLinked(true);
    } else {
      // Already in viewport — let initial/animate handle it
      revealedRef.current = true;
    }
  }, [scrollYProgress]);

  const opacity = useTransform(scrollYProgress, (v) => {
    if (reducedMotion || revealedRef.current) return 1;
    if (v >= 1) {
      revealedRef.current = true;
      return 1;
    }
    return ease(v);
  });

  const y = useTransform(scrollYProgress, (v) => {
    if (reducedMotion || revealedRef.current) return 0;
    if (v >= 1) {
      revealedRef.current = true;
      return 0;
    }
    return 24 * (1 - ease(v));
  });

  const scale = useTransform(scrollYProgress, (v) => {
    if (reducedMotion || revealedRef.current) return 1;
    if (v >= 1) {
      revealedRef.current = true;
      return 1;
    }
    return 0.98 + 0.02 * ease(v);
  });

  return { ref, opacity, y, scale, scrollLinked };
}
