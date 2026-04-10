"use client";

import { useRef, useEffect } from "react";
import { animate } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useUploadModal } from "@/components/upload/upload-modal-context";

const SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

const BREATH_DELAY_MS = 140;

export function SendItButton() {
  const { isOpen, open, buttonPillRef } = useUploadModal();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Entrance animation (first load only)
  useEffect(() => {
    if (hasAnimated.current || !containerRef.current) return;
    hasAnimated.current = true;

    const container = containerRef.current;
    const chars = container.querySelectorAll("[data-char]");
    const arrowWrap = container.querySelector("[data-arrow-wrap]") as HTMLElement | null;

    container.style.opacity = "1";

    // Stagger chars in
    chars.forEach((char, i) => {
      const el = char as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
      setTimeout(() => {
        animate(el, { opacity: 1, y: 0 }, SPRING);
      }, BREATH_DELAY_MS + i * 30);
    });

    // Arrow slides in after chars
    if (arrowWrap) {
      arrowWrap.style.opacity = "0";
      arrowWrap.style.transform = "translateX(-8px)";
      setTimeout(() => {
        animate(arrowWrap, { opacity: 1, x: 0 }, SPRING);
      }, BREATH_DELAY_MS + chars.length * 30);
    }
  }, []);

  // On open: hide container + reset arrow for next close cycle
  useEffect(() => {
    if (!containerRef.current) return;

    if (isOpen) {
      containerRef.current.style.opacity = "0";
      const arrowWrap = containerRef.current.querySelector("[data-arrow-wrap]") as HTMLElement | null;
      if (arrowWrap) {
        arrowWrap.style.transform = "";
        arrowWrap.style.opacity = "";
        arrowWrap.style.visibility = "";
      }
    }
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
