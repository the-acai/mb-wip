"use client";

import { useRef, useEffect, useState } from "react";
import { motion, animate } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useUploadModal } from "@/components/upload/upload-modal-context";
import {
  SpringTuner,
  DEFAULT_HOVER_SPRING,
  type HoverSpringConfig,
} from "./spring-tuner";

const ENTRANCE_SPRING = {
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
  const [hoverSpring, setHoverSpring] =
    useState<HoverSpringConfig>(DEFAULT_HOVER_SPRING);

  const springTransition = {
    type: "spring" as const,
    mass: hoverSpring.mass,
    stiffness: hoverSpring.stiffness,
    damping: hoverSpring.damping,
  };

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
        animate(el, { opacity: 1, y: 0 }, ENTRANCE_SPRING);
      }, BREATH_DELAY_MS + i * 30);
    });

    // Arrow slides in after chars
    if (arrowWrap) {
      arrowWrap.style.opacity = "0";
      arrowWrap.style.transform = "translateX(-8px)";
      setTimeout(() => {
        animate(arrowWrap, { opacity: 1, x: 0 }, ENTRANCE_SPRING);
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

  const basePad = 24;

  return (
    <>
      <div
        ref={containerRef}
        data-send-it-container
        className="fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
        style={{ opacity: 0, pointerEvents: isOpen ? "none" : "auto" }}
      >
        <motion.button
          onClick={open}
          className="flex cursor-pointer items-center gap-0.5"
          whileHover="hover"
          initial="idle"
        >
          <motion.span
            ref={buttonPillRef as React.RefObject<HTMLSpanElement>}
            className="inline-flex h-12 items-center overflow-hidden rounded-full bg-[var(--text-dark)]"
            variants={{
              idle: { paddingLeft: basePad, paddingRight: basePad },
              hover: {
                paddingLeft: basePad + hoverSpring.paddingExpand,
                paddingRight: basePad + hoverSpring.paddingExpand,
              },
            }}
            transition={springTransition}
          >
            {"SEND IT".split("").map((char, i) => (
              <motion.span
                key={i}
                data-char
                className="inline-block font-heading text-base font-bold text-[var(--page-bg)]"
                variants={{
                  idle: { y: 0 },
                  hover: { y: -hoverSpring.letterY },
                }}
                transition={{
                  ...springTransition,
                  delay: i * (hoverSpring.staggerMs / 1000),
                }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.span>
          <span
            data-arrow-wrap
            className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]"
          >
            <ArrowRight className="size-5 text-[var(--page-bg)]" />
          </span>
        </motion.button>
      </div>

      <SpringTuner config={hoverSpring} onChange={setHoverSpring} />
    </>
  );
}
