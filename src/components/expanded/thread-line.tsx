"use client";

import { motion } from "motion/react";

// 20% slower than the comment spring (1.2/170/16)
const LINE_SPRING = {
  type: "spring" as const,
  mass: 1.44,
  stiffness: 170,
  damping: 16,
};

interface ThreadLineProps {
  colorTop: string;
  colorBottom: string;
  /** Delay in seconds — should land after the next comment has animated in */
  delay?: number;
}

export function ThreadLine({ colorTop, colorBottom, delay = 0 }: ThreadLineProps) {
  return (
    <motion.div
      className="absolute left-[18px] top-[36px] w-0.5 origin-top"
      style={{
        height: "calc(100% - 4px)",
        background: `linear-gradient(in oklch, ${colorTop}, ${colorBottom})`,
      }}
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ ...LINE_SPRING, delay }}
    />
  );
}
