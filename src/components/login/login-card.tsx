"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useVelocity,
  useTransform,
  useSpring,
  type MotionValue,
} from "motion/react";

type Phase = "entering" | "idle" | "dragging" | "consuming";

const ENTRANCE_SPRING = { type: "spring" as const, mass: 1.2, stiffness: 170, damping: 16 };
const CONSUME_SPRING = { type: "spring" as const, mass: 0.6, stiffness: 400, damping: 30 };
const TILT_SPRING = { mass: 0.3, stiffness: 200, damping: 20 };

interface LoginCardProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;
  onConsume: () => void;
  distanceToBottom: number;
}

export function LoginCard({
  x,
  y,
  phase,
  onPhaseChange,
  onConsume,
  distanceToBottom,
}: LoginCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const consumedRef = useRef(false);

  // Velocity-based 3D tilt
  const vx = useVelocity(x);
  const vy = useVelocity(y);
  const rawRotateY = useTransform(vx, [-1500, 0, 1500], [10, 0, -10]);
  const rawRotateX = useTransform(vy, [-1500, 0, 1500], [-10, 0, 10]);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const rotateX = useSpring(rawRotateX, TILT_SPRING);

  // Check if card bottom has reached viewport bottom during drag
  const handleDrag = useCallback(() => {
    if (consumedRef.current) return;
    if (y.get() >= distanceToBottom) {
      consumedRef.current = true;
      onPhaseChange("consuming");
    }
  }, [y, distanceToBottom, onPhaseChange]);

  // Reset consumed flag when phase changes away from consuming
  useEffect(() => {
    if (phase !== "consuming") {
      consumedRef.current = false;
    }
  }, [phase]);

  // Determine initial/animate values based on phase
  const isDraggable = phase === "idle" || phase === "dragging";

  // Window height for entrance offset (measured once)
  const windowH = typeof window !== "undefined" ? window.innerHeight : 900;

  return (
    <motion.div
      ref={cardRef}
      className="relative cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        x,
        y,
        rotateX,
        rotateY,
        transformPerspective: 800,
        width: 432,
        height: 757,
      }}
      drag={isDraggable}
      dragMomentum={false}
      dragElastic={0.1}
      dragTransition={{
        power: 0,
        timeConstant: 0,
        bounceStiffness: 170,
        bounceDamping: 18,
      }}
      onDrag={handleDrag}
      onDragStart={() => onPhaseChange("dragging")}
      onDragEnd={() => {
        if (phase === "dragging") onPhaseChange("idle");
      }}
      // Entrance animation
      initial={{ y: windowH * 0.6, scale: 0.9, opacity: 0 }}
      animate={
        phase === "consuming"
          ? { y: windowH, scale: 0.95, opacity: 0 }
          : phase === "entering"
            ? { y: 0, scale: 1, opacity: 1 }
            : undefined
      }
      transition={phase === "consuming" ? CONSUME_SPRING : ENTRANCE_SPRING}
      onAnimationComplete={() => {
        if (phase === "entering") {
          onPhaseChange("idle");
        }
        if (phase === "consuming") {
          onConsume();
        }
      }}
    >
      {/* Placeholder card visual — will be replaced by WebGL canvas in Step 3 */}
      <div className="w-full h-full rounded-2xl bg-[#1b1b1b] overflow-hidden flex flex-col items-center justify-between py-14 px-10">
        <p className="font-heading text-[28px] font-black tracking-tight text-white/30">
          matchbox
        </p>
        <div className="text-center">
          <p className="font-heading text-[36px] font-black leading-[1.02] tracking-tight text-white/30">
            WORKS IN
            <br />
            PROGRESS
          </p>
        </div>
        <div className="text-center">
          <p className="font-heading text-[36px] font-black tracking-tight text-white/30">
            ACCESS
          </p>
          <svg
            className="mx-auto mt-2 text-white/30"
            width="40"
            height="20"
            viewBox="0 0 40 20"
            fill="none"
          >
            <path
              d="M4 4L20 16L36 4"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
