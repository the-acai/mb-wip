"use client";

import { useRef, useCallback } from "react";
import { motion, type PanInfo } from "motion/react";
import { positionToColor } from "@/lib/color-utils";

interface ColorPickerProps {
  layoutId: string;
  color: string;
  draggable: boolean;
  onColorChange: (hex: string) => void;
  onDragStart: () => void;
  onEntranceComplete: () => void;
}

const ENTRANCE_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 140,
  damping: 18,
};

export function ColorPicker({
  layoutId,
  color,
  draggable,
  onColorChange,
  onDragStart,
  onEntranceComplete,
}: ColorPickerProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);
  const entranceDone = useRef(false);

  const handleDragStart = useCallback(() => {
    if (!hasDragged.current) {
      hasDragged.current = true;
      onDragStart();
    }
  }, [onDragStart]);

  const handleDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      const maxRadius = Math.min(window.innerWidth, window.innerHeight) / 2;
      const hex = positionToColor(info.offset.x, info.offset.y, maxRadius);
      onColorChange(hex);
    },
    [onColorChange],
  );

  const handleEntranceComplete = useCallback(() => {
    if (!entranceDone.current) {
      entranceDone.current = true;
      onEntranceComplete();
    }
  }, [onEntranceComplete]);

  return (
    <motion.div
      ref={constraintsRef}
      className="fixed inset-0"
      style={{ pointerEvents: draggable ? "auto" : "none" }}
    >
      <motion.div
        layoutId={layoutId}
        className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: "0 0 0 3px rgba(255,255,255,0.9), 0 2px 12px rgba(0,0,0,0.15)",
          cursor: draggable ? "grab" : "default",
        }}
        initial={{ y: 48, scale: 0 }}
        animate={{ y: 0, scale: 1 }}
        transition={ENTRANCE_SPRING}
        onAnimationComplete={handleEntranceComplete}
        drag={draggable}
        dragConstraints={constraintsRef}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        whileDrag={{ cursor: "grabbing" }}
      />
    </motion.div>
  );
}
