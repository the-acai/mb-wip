"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  motion,
  useMotionValue,
  useVelocity,
  useTransform,
  useSpring,
  type MotionValue,
} from "motion/react";
import {
  createHolographicShader,
  type UniformState,
} from "./holographic-shader";
import { generateTextMask } from "./text-mask";

type Phase = "entering" | "idle" | "dragging" | "consuming";

const ENTRANCE_SPRING = { type: "spring" as const, mass: 1.2, stiffness: 170, damping: 16 };
const CONSUME_SPRING = { type: "spring" as const, mass: 0.6, stiffness: 400, damping: 30 };
const TILT_SPRING = { mass: 0.3, stiffness: 200, damping: 20 };
const HOVER_TILT_SPRING = { mass: 0.5, stiffness: 150, damping: 18 };
const MAX_HOVER_TILT = 6; // degrees

const CARD_WIDTH = 432;
const CARD_HEIGHT = 757;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const consumedRef = useRef(false);
  const uniformStateRef = useRef<UniformState>({
    tiltX: 0,
    tiltY: 0,
    cursorX: 0.5,
    cursorY: 0.5,
  });
  const [webglFailed, setWebglFailed] = useState(false);

  // --- Hover-based tilt (position-based, works without dragging) ---
  const hoverTiltX = useMotionValue(0);
  const hoverTiltY = useMotionValue(0);
  const smoothHoverTiltX = useSpring(hoverTiltX, HOVER_TILT_SPRING);
  const smoothHoverTiltY = useSpring(hoverTiltY, HOVER_TILT_SPRING);

  // --- Velocity-based tilt (from drag movement) ---
  const vx = useVelocity(x);
  const vy = useVelocity(y);
  const dragTiltY = useSpring(
    useTransform(vx, [-1500, 0, 1500], [10, 0, -10]),
    TILT_SPRING
  );
  const dragTiltX = useSpring(
    useTransform(vy, [-1500, 0, 1500], [-10, 0, 10]),
    TILT_SPRING
  );

  // --- Combine hover + drag tilt ---
  const isDragging = phase === "dragging";
  const rotateX = useTransform(
    [smoothHoverTiltX, dragTiltX],
    ([hover, drag]: number[]) => isDragging ? drag : hover + drag
  );
  const rotateY = useTransform(
    [smoothHoverTiltY, dragTiltY],
    ([hover, drag]: number[]) => isDragging ? drag : hover + drag
  );

  // Sync combined tilt values to shader uniforms (no re-renders)
  useEffect(() => {
    const unsubY = rotateY.on("change", (v) => {
      uniformStateRef.current.tiltX = (v * Math.PI) / 180;
    });
    const unsubX = rotateX.on("change", (v) => {
      uniformStateRef.current.tiltY = (v * Math.PI) / 180;
    });
    return () => { unsubY(); unsubX(); };
  }, [rotateY, rotateX]);

  // Initialize WebGL shader
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let controller: { destroy(): void } | null = null;

    async function init() {
      try {
        const mask = await generateTextMask(CARD_WIDTH, CARD_HEIGHT);
        controller = createHolographicShader(
          canvas!,
          mask,
          uniformStateRef.current
        );
      } catch (e) {
        console.warn("WebGL shader init failed:", e);
        setWebglFailed(true);
      }
    }

    init();
    return () => { controller?.destroy(); };
  }, []);

  // Cursor tracking: updates shader uniforms AND hover tilt
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    // Shader cursor uniform
    uniformStateRef.current.cursorX = normX;
    uniformStateRef.current.cursorY = 1.0 - normY;

    // Hover tilt: cursor at center = 0, at edges = ±MAX_HOVER_TILT
    hoverTiltY.set((normX - 0.5) * MAX_HOVER_TILT * 2);
    hoverTiltX.set(-(normY - 0.5) * MAX_HOVER_TILT * 2);
  }, [hoverTiltX, hoverTiltY]);

  const handlePointerLeave = useCallback(() => {
    hoverTiltX.set(0);
    hoverTiltY.set(0);
    uniformStateRef.current.cursorX = 0.5;
    uniformStateRef.current.cursorY = 0.5;
  }, [hoverTiltX, hoverTiltY]);

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

  const isDraggable = phase === "idle" || phase === "dragging";
  const windowH = typeof window !== "undefined" ? window.innerHeight : 900;

  return (
    <motion.div
      initial={{ y: windowH * 0.6, scale: 0.9, opacity: 0 }}
      animate={
        phase === "consuming"
          ? { y: windowH, scale: 0.95, opacity: 0 }
          : { y: 0, scale: 1, opacity: 1 }
      }
      transition={phase === "consuming" ? CONSUME_SPRING : ENTRANCE_SPRING}
      onAnimationComplete={() => {
        if (phase === "entering") onPhaseChange("idle");
        if (phase === "consuming") onConsume();
      }}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <motion.div
        className="relative cursor-grab active:cursor-grabbing select-none touch-none w-full h-full"
        style={{
          x,
          y,
          rotateX,
          rotateY,
          transformPerspective: 800,
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
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="w-full h-full rounded-2xl bg-[#1b1b1b] overflow-hidden relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: webglFailed ? "none" : "block" }}
          />
          {webglFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-between py-14 px-10">
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
                <svg className="mx-auto mt-2 text-white/30" width="40" height="20" viewBox="0 0 40 20" fill="none">
                  <path d="M4 4L20 16L36 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
