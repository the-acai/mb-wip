"use client";

import { motion, useReducedMotion } from "motion/react";
import { useExpansion } from "@/components/expanded/expansion-context";
import { SPRING, INSTANT } from "@/lib/motion";
import { FeedSearchTrigger } from "./feed-search-trigger";
import { SendItButton } from "./send-it-button";

const HIDE_OFFSET_PX = 200;

/**
 * Bottom-center action pair (search trigger + SEND IT). Springs out below the
 * viewport whenever a post overlay is expanded so they don't compete with the
 * lifted card. `x: -50%` is owned by Motion so its transform composes cleanly
 * with the `y` animation (using Tailwind's `-translate-x-1/2` would clobber
 * the transform when motion writes its own).
 */
export function BottomActionGroup() {
  const { postData } = useExpansion();
  const reducedMotion = useReducedMotion();
  const hidden = !!postData;

  return (
    <motion.div
      className="pointer-events-none fixed bottom-[4svh] left-1/2 z-50 flex items-center gap-3"
      initial={{ x: "-50%", y: 0 }}
      animate={{ x: "-50%", y: hidden ? HIDE_OFFSET_PX : 0 }}
      transition={reducedMotion ? INSTANT : SPRING.soft}
      style={{ pointerEvents: hidden ? "none" : undefined }}
      aria-hidden={hidden}
    >
      <FeedSearchTrigger />
      <SendItButton />
    </motion.div>
  );
}
