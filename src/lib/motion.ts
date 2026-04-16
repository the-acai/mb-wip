import type { Transition } from "motion/react";

/**
 * Named spring transitions. Use these instead of inlining
 * `{ type: "spring", mass, stiffness, damping }`.
 */
export const SPRING = {
  /** Workhorse — layout FLIPs, card expansion, pill entrance. */
  default: {
    type: "spring",
    mass: 1.2,
    stiffness: 170,
    damping: 16,
  },
  /** Bottom action group entrance — slightly damped variant. */
  soft: {
    type: "spring",
    mass: 1.2,
    stiffness: 170,
    damping: 18,
  },
  /** Shrinking header entrance — heavier and slower. */
  cardSoft: {
    type: "spring",
    mass: 2,
    stiffness: 100,
    damping: 16,
  },
  /** Onboarding "⏎ to select" hint and transitions. */
  onboardingCard: {
    type: "spring",
    mass: 1.2,
    stiffness: 140,
    damping: 18,
  },
  /** Login card — recenter/consume after drag. */
  consume: {
    type: "spring",
    mass: 0.75,
    stiffness: 200,
    damping: 16,
  },
  /** Login card — physical tilt. */
  tilt: {
    mass: 0.3,
    stiffness: 200,
    damping: 20,
  },
  /** Login card — hover-tilt. */
  hoverTilt: {
    mass: 0.5,
    stiffness: 150,
    damping: 18,
  },
} satisfies Record<string, Transition | object>;

/** No animation — for `useReducedMotion` branches. */
export const INSTANT = { duration: 0 } as const;

/** Ease curve used by onboarding text reveals. */
export const EASE_OUT_EXPO: readonly [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];
