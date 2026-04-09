"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";

const CARD_SPRING = { type: "spring" as const, mass: 2, stiffness: 100, damping: 16 };

export function ShrinkingHeader() {
  const headerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });

  // Scroll-driven transforms — all motion values, zero re-renders
  const fontSize = useTransform(scrollYProgress, [0, 1], [64, 24]);
  const scrollOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.8, 1]);

  // Start centered in the 40svh space, translate up to top-4 as user scrolls
  const scrollY = useTransform(scrollYProgress, (v) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 900;
    const center = vh * 0.2; // middle of 40svh
    const fs = 64 - v * 40; // current interpolated font size
    const halfText = (fs * 1.18) / 2; // half the line height
    return (1 - v) * (center - 16 - halfText); // 16 = top-4
  });

  const blendMode = useTransform(scrollYProgress, (v) =>
    v > 0.5 ? "difference" : "normal"
  );

  return (
    <>
      {/* Spacer — defines the scroll range for the shrink animation */}
      <div ref={headerRef} className="px-6" style={{ height: "40svh" }} />

      {/* Entrance wrapper — fades/slides in, then scroll takes over */}
      <motion.div
        className="fixed top-4 left-0 right-0 z-40 pointer-events-none"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          default: CARD_SPRING,
          opacity: { duration: 0.4, ease: "easeOut" },
        }}
      >
        <Link href="/feed" className="pointer-events-auto">
          <motion.h1
            className="text-center font-heading font-black leading-[1.18] tracking-[-0.01em] text-[var(--text-dark)]"
            style={{ fontSize, opacity: scrollOpacity, y: scrollY, mixBlendMode: blendMode as never }}
          >
            WORKS IN PROGRESS
          </motion.h1>
        </Link>
      </motion.div>
    </>
  );
}
