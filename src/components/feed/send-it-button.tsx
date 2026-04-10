"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { useUploadModal } from "@/components/upload/upload-modal-context";

const BREATH_DELAY = 0.14;

export function SendItButton() {
  const { isOpen, open, buttonPillRef } = useUploadModal();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Entrance: staggered char reveal
  useEffect(() => {
    if (hasAnimated.current || !containerRef.current) return;
    hasAnimated.current = true;

    const pill = containerRef.current.querySelector("[data-pill]");
    const chars = containerRef.current.querySelectorAll("[data-char]");
    const arrowWrap = containerRef.current.querySelector("[data-arrow-wrap]");

    gsap.set(containerRef.current, { opacity: 1 });

    // Chars fade + slide up
    gsap.fromTo(chars, { opacity: 0, y: 12 }, {
      opacity: 1, y: 0,
      duration: 0.5,
      stagger: 0.03,
      delay: BREATH_DELAY,
      ease: "back.out(2)",
    });

    // Arrow circle
    if (arrowWrap) {
      gsap.fromTo(arrowWrap, { opacity: 0, x: -8 }, {
        opacity: 1, x: 0,
        duration: 0.4,
        delay: BREATH_DELAY + 0.03 * 7,
        ease: "back.out(2)",
      });
    }

    // Pill container
    if (pill) {
      gsap.fromTo(pill, { opacity: 0 }, {
        opacity: 1,
        duration: 0.3,
        delay: BREATH_DELAY,
        ease: "power2.out",
      });
    }
  }, []);

  // Hide/show based on modal state
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { opacity: isOpen ? 0 : 1 });
  }, [isOpen]);

  const text = "SEND IT";

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
      style={{ opacity: 0, pointerEvents: isOpen ? "none" : "auto" }}
    >
      <button
        onClick={open}
        className="group flex items-center gap-0.5"
      >
        {/* Pill — CSS handles hover padding scale */}
        <span
          data-pill
          ref={buttonPillRef as React.RefObject<HTMLSpanElement>}
          className="inline-flex h-12 items-center overflow-hidden rounded-full bg-[var(--text-dark)] px-6 transition-[padding] duration-300 ease-out group-hover:px-8"
        >
          {text.split("").map((char, i) => (
            <span
              key={i}
              data-char
              className="inline-block font-heading text-base font-bold text-[var(--page-bg)] group-hover:animate-[letter-bounce_600ms_ease-out]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>
        {/* Arrow circle */}
        <span
          data-arrow-wrap
          data-char
          className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]"
        >
          <ArrowRight className="size-5 text-[var(--page-bg)]" />
        </span>
      </button>
    </div>
  );
}
