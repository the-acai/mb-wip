"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
} from "motion/react";
import { SPRING } from "@/lib/motion";

const HEADLINE_TEXT = "WORKS IN PROGRESS";
const HEADLINE_DEFAULT_MAX = 64;
const HEADLINE_MIN = 24;
// Total horizontal padding (16px each side) the headline must respect when
// fully expanded so it doesn't bleed past the edge of the viewport on phones.
const HEADLINE_HORIZONTAL_PADDING = 32;

export function ShrinkingHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });

  // Largest font size at which "WORKS IN PROGRESS" still fits inside the
  // viewport (minus margins). Defaults to 64 for SSR / first paint, then
  // refined on mount via DOM measurement and updated on resize / fontsload
  // so a late-loading TypeKit parabolica doesn't wreck the math.
  const maxFontSize = useMotionValue(HEADLINE_DEFAULT_MAX);

  // Client-side viewport height. Starts at 0 so the scroll transform below
  // returns 0 on server + pre-hydration (no SSR/client mismatch). Populated
  // in a layout effect so the real value is in place before first paint.
  const viewportHeight = useMotionValue(0);

  useEffect(() => {
    viewportHeight.set(window.innerHeight);
    const onResize = () => viewportHeight.set(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [viewportHeight]);

  useEffect(() => {
    const measure = () => {
      // Render the headline once at a known size off-screen to learn the
      // text-width / font-size ratio the current font produces, then back
      // out the largest size that fits the viewport.
      const probe = document.createElement("span");
      probe.textContent = HEADLINE_TEXT;
      probe.style.cssText = [
        "position:absolute",
        "visibility:hidden",
        "left:-9999px",
        "top:0",
        "font-family:'parabolica', sans-serif",
        "font-weight:900",
        "letter-spacing:-0.01em",
        "line-height:1.18",
        "font-size:100px",
        "white-space:nowrap",
      ].join(";");
      document.body.appendChild(probe);
      const ratio = probe.offsetWidth / 100;
      document.body.removeChild(probe);

      if (ratio <= 0) return;
      const available = window.innerWidth - HEADLINE_HORIZONTAL_PADDING;
      const fitted = available / ratio;
      maxFontSize.set(Math.min(HEADLINE_DEFAULT_MAX, fitted));
    };

    measure();
    window.addEventListener("resize", measure);
    // parabolica loads via TypeKit async — re-measure once it's in so we
    // don't lock the cap to the fallback font's metrics.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }
    return () => window.removeEventListener("resize", measure);
  }, [maxFontSize]);

  // Scroll-driven transforms — all motion values, zero re-renders
  const fontSize = useTransform(
    [scrollYProgress, maxFontSize],
    ([v, max]: number[]) => max - (max - HEADLINE_MIN) * v
  );
  const scrollOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.8, 1]);

  // Start centered in the 40svh space, translate up to top-4 as user scrolls.
  // Returns 0 until viewportHeight is populated (server + pre-hydration) so
  // SSR markup matches the first client render.
  const scrollY = useTransform(
    [scrollYProgress, maxFontSize, viewportHeight],
    ([v, max, vh]: number[]) => {
      if (!vh) return 0;
      const center = vh * 0.2; // middle of 40svh
      const fs = max - v * (max - HEADLINE_MIN); // current interpolated font size
      const halfText = (fs * 1.18) / 2; // half the line height
      return (1 - v) * (center - 16 - halfText); // 16 = top-4
    }
  );

  const blendMode = useTransform(scrollYProgress, (v) =>
    v > 0.5 ? "difference" : "normal"
  );

  // Reduced-motion path: render the header at its final-state position with no
  // entrance spring and no scroll-driven transforms. The 40svh spacer stays so
  // the page layout is unchanged.
  const headlineStyle = reducedMotion
    ? { fontSize: HEADLINE_MIN, opacity: 1 }
    : { fontSize, opacity: scrollOpacity, y: scrollY, mixBlendMode: blendMode as never };

  return (
    <>
      {/* Spacer — defines the scroll range for the shrink animation */}
      <div ref={headerRef} className="px-6" style={{ height: "40svh" }} />

      {/* Entrance wrapper — fades/slides in, then scroll takes over */}
      <motion.div
        className="fixed top-4 left-0 right-0 z-40 pointer-events-none"
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { default: SPRING.cardSoft, opacity: { duration: 0.4, ease: "easeOut" } }
        }
      >
        <motion.h1
          className="text-center font-heading font-black leading-[1.18] tracking-[-0.01em] text-[var(--text-dark)]"
          style={headlineStyle}
        >
          WORKS IN PROGRESS
        </motion.h1>
      </motion.div>
    </>
  );
}
