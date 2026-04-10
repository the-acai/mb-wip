"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useUploadModal } from "@/components/upload/upload-modal-context";

const CARD_SPRING = { type: "spring" as const, mass: 2, stiffness: 100, damping: 16 };
const BREATH_DELAY = 0.14; // withinRowMs (80) + rowBreathMs (60)

export function SendItButton() {
  const { isOpen, open } = useUploadModal();

  return (
    <motion.div
      className="fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: isOpen ? 0 : 1, y: 0 }}
      transition={{
        default: { ...CARD_SPRING, delay: BREATH_DELAY },
        opacity: { duration: 0.4, ease: "easeOut", delay: BREATH_DELAY },
      }}
      style={{ pointerEvents: isOpen ? "none" : "auto" }}
    >
      <button
        onClick={open}
        className="group flex items-center gap-0.5"
      >
        <motion.span
          layoutId="send-it"
          className="inline-flex h-12 items-center overflow-hidden bg-[var(--text-dark)] px-6 transition-[padding] duration-300 ease-out group-hover:px-8"
          style={{ borderRadius: 9999 }}
          transition={{ layout: { type: "spring", mass: 1.2, stiffness: 170, damping: 16 } }}
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
        </motion.span>
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]">
          <ArrowRight className="size-5 text-[var(--page-bg)]" />
        </span>
      </button>
    </motion.div>
  );
}
