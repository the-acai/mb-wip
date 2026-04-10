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

  // Entrance animation (first load only)
  useEffect(() => {
    if (hasAnimated.current || !containerRef.current) return;
    hasAnimated.current = true;

    const chars = containerRef.current.querySelectorAll("[data-char]");
    const arrowWrap = containerRef.current.querySelector("[data-arrow-wrap]");

    gsap.set(containerRef.current, { opacity: 1 });

    gsap.fromTo(chars, { opacity: 0, y: 12 }, {
      opacity: 1, y: 0,
      duration: 0.5, stagger: 0.03,
      delay: BREATH_DELAY, ease: "back.out(2)",
    });

    if (arrowWrap) {
      gsap.fromTo(arrowWrap, { opacity: 0, x: -8 }, {
        opacity: 1, x: 0,
        duration: 0.4, delay: BREATH_DELAY + 0.03 * 7,
        ease: "back.out(2)",
      });
    }
  }, []);

  // On open: hide container + reset arrow to clean state for next close
  useEffect(() => {
    if (!containerRef.current) return;

    if (isOpen) {
      gsap.set(containerRef.current, { opacity: 0 });
      // Reset arrow to default visible state (clear any leftover from close animation)
      const arrowWrap = containerRef.current.querySelector("[data-arrow-wrap]") as HTMLElement | null;
      if (arrowWrap) {
        gsap.set(arrowWrap, { x: 0, opacity: 1, clearProps: "transform" });
      }
    }
    // On close: do nothing — overlay handles the transition
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      data-send-it-container
      className="fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
      style={{ opacity: 0, pointerEvents: isOpen ? "none" : "auto" }}
    >
      <button onClick={open} className="group flex items-center gap-0.5">
        <span
          ref={buttonPillRef as React.RefObject<HTMLSpanElement>}
          className="inline-flex h-12 items-center overflow-hidden rounded-full bg-[var(--text-dark)] px-6 transition-[padding] duration-300 ease-out group-hover:px-8"
        >
          {"SEND IT".split("").map((char, i) => (
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
        <span
          data-arrow-wrap
          className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]"
        >
          <ArrowRight className="size-5 text-[var(--page-bg)]" />
        </span>
      </button>
    </div>
  );
}
