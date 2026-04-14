import { useRef } from "react";
import { useScroll, useTransform, useReducedMotion } from "motion/react";

const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const revealedRef = useRef(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end 0.8"],
  });

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
    return 16 * (1 - ease(v));
  });

  const scale = useTransform(scrollYProgress, (v) => {
    if (reducedMotion || revealedRef.current) return 1;
    if (v >= 1) {
      revealedRef.current = true;
      return 1;
    }
    return 0.98 + 0.02 * ease(v);
  });

  return { ref, opacity, y, scale };
}
