"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const CARD_SPRING = { type: "spring" as const, mass: 2, stiffness: 100, damping: 16 };
const BREATH_DELAY = 0.14; // withinRowMs (80) + rowBreathMs (60)

export function SendItButton() {
  return (
    <motion.div
      className="fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        default: { ...CARD_SPRING, delay: BREATH_DELAY },
        opacity: { duration: 0.4, ease: "easeOut", delay: BREATH_DELAY },
      }}
    >
      <Link
        href="/post/new"
        className="group flex items-center gap-0.5"
      >
        <span className="inline-flex h-12 items-center overflow-hidden rounded-full bg-[var(--text-dark)] px-6 transition-[padding] duration-300 ease-out group-hover:px-8">
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
      </Link>
    </motion.div>
  );
}
