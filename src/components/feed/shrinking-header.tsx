"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";

export function ShrinkingHeader() {
  const headerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });

  // Scroll-driven transforms — all motion values, zero re-renders
  const fontSize = useTransform(scrollYProgress, [0, 1], [64, 24]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.8, 1]);
  const blendMode = useTransform(scrollYProgress, (v) =>
    v > 0.5 ? "difference" : "normal"
  );

  return (
    <header
      ref={headerRef}
      className="flex items-center justify-center px-6"
      style={{ height: "40svh" }}
    >
      <Link href="/feed" className="sticky top-4 z-40 block w-full">
        <motion.h1
          className="text-center font-heading font-black leading-[1.18] tracking-[-0.01em] text-[var(--text-dark)]"
          style={{ fontSize, opacity, mixBlendMode: blendMode as never }}
        >
          WORKS IN PROGRESS
        </motion.h1>
      </Link>
    </header>
  );
}
