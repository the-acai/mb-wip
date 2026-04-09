"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const LARGE_SIZE = 64; // px
const SMALL_SIZE = 24; // px
const FIXED_TOP = 16; // px from top when fixed

export function ShrinkingHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const header = headerRef.current;
      if (!header) return;

      // The header's natural bottom edge is where the cards start
      const headerBottom = header.offsetTop + header.offsetHeight;
      // Shrink over the distance from scroll=0 to when header would scroll out
      const scrollY = window.scrollY;
      const progress = Math.min(1, Math.max(0, scrollY / Math.max(headerBottom - FIXED_TOP - 40, 1)));
      setScrollProgress(progress);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fontSize = LARGE_SIZE - (LARGE_SIZE - SMALL_SIZE) * scrollProgress;
  const isFixed = scrollProgress > 0.1;

  return (
    <>
      {/* Spacer to vertically center the headline between viewport top and card top */}
      <header
        ref={headerRef}
        className="flex items-center justify-center px-6"
        style={{ height: "40svh" }}
      >
        {/* Invisible placeholder to maintain layout when headline becomes fixed */}
        <div
          className="font-heading font-black leading-[1.18] tracking-[-0.01em] text-center invisible"
          style={{ fontSize: LARGE_SIZE }}
          aria-hidden
        >
          WORKS IN PROGRESS
        </div>
      </header>

      {/* The actual headline — transitions from centered to fixed */}
      <Link
        href="/feed"
        className="pointer-events-auto"
        style={{
          position: isFixed ? "fixed" : "absolute",
          top: isFixed ? FIXED_TOP : headerRef.current
            ? headerRef.current.offsetTop + headerRef.current.offsetHeight / 2 - fontSize * 1.18 / 2
            : "20svh",
          left: 0,
          right: 0,
          zIndex: 40,
          mixBlendMode: scrollProgress > 0.5 ? "difference" : "normal",
          transition: "mix-blend-mode 0.3s ease",
        }}
      >
        <h1
          className="text-center font-heading font-black leading-[1.18] tracking-[-0.01em] text-[var(--text-dark)]"
          style={{
            fontSize,
            transition: "font-size 0.05s linear",
          }}
        >
          WORKS IN PROGRESS
        </h1>
      </Link>
    </>
  );
}
