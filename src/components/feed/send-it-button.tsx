"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { useUploadModal } from "@/components/upload/upload-modal-context";

const BREATH_DELAY = 0.14; // withinRowMs (80) + rowBreathMs (60)

export function SendItButton() {
  const { isOpen, open, buttonPillRef } = useUploadModal();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Entrance animation (replaces Motion initial/animate)
  useEffect(() => {
    if (hasAnimated.current || !containerRef.current) return;
    hasAnimated.current = true;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: BREATH_DELAY,
        ease: "power2.out",
      }
    );
  }, []);

  // Hide instantly when modal opens (hero takes over the text),
  // show instantly when modal closes (hero has returned to button rect)
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { opacity: isOpen ? 0 : 1 });
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
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
              className="inline-block font-heading text-base font-bold text-[var(--page-bg)] group-hover:animate-[letter-bounce_600ms_ease-out]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]">
          <ArrowRight className="size-5 text-[var(--page-bg)]" />
        </span>
      </button>
    </div>
  );
}
