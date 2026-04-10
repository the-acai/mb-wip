"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { useUploadModal } from "@/components/upload/upload-modal-context";

const BREATH_DELAY = 0.14;

export function SendItButton() {
  const { isOpen, open, buttonPillRef } = useUploadModal();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const arrowWrapRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  // Entrance: staggered char reveal
  useEffect(() => {
    if (hasAnimated.current || !containerRef.current || !textRef.current) return;
    hasAnimated.current = true;

    const chars = textRef.current.querySelectorAll("[data-char]");
    const arrow = arrowWrapRef.current;

    gsap.set(containerRef.current, { opacity: 1 });

    gsap.fromTo(chars, {
      opacity: 0, y: 12,
    }, {
      opacity: 1, y: 0,
      duration: 0.5,
      stagger: 0.03,
      delay: BREATH_DELAY,
      ease: "back.out(2)",
    });

    if (arrow) {
      gsap.fromTo(arrow, {
        opacity: 0, x: -8,
      }, {
        opacity: 1, x: 0,
        duration: 0.4,
        delay: BREATH_DELAY + 0.03 * 7, // after last char
        ease: "back.out(2)",
      });
    }
  }, []);

  // Hover: GSAP-driven letter bounce
  const handleMouseEnter = () => {
    if (!textRef.current || isOpen) return;
    const chars = textRef.current.querySelectorAll("[data-char]");
    gsap.to(chars, {
      y: -3,
      duration: 0.25,
      stagger: 0.03,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
    });
  };

  // Hide/show based on modal state
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { opacity: isOpen ? 0 : 1 });
  }, [isOpen]);

  // "SEND IT" as individual char spans + arrow icon
  const text = "SEND IT";

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
      style={{ opacity: 0, pointerEvents: isOpen ? "none" : "auto" }}
    >
      <button
        onClick={open}
        onMouseEnter={handleMouseEnter}
        className="group flex items-center gap-0.5"
      >
        <span
          ref={(el) => {
            (textRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
            (buttonPillRef as React.MutableRefObject<HTMLElement | null>).current = el;
          }}
          className="inline-flex h-12 items-center overflow-hidden rounded-full bg-[var(--text-dark)] px-6"
        >
          {text.split("").map((char, i) => (
            <span
              key={i}
              data-char
              className="inline-block font-heading text-base font-bold text-[var(--page-bg)]"
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>
        <span
          ref={arrowWrapRef}
          data-char
          className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]"
        >
          <ArrowRight className="size-5 text-[var(--page-bg)]" />
        </span>
      </button>
    </div>
  );
}
