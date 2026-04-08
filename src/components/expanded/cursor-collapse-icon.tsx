"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const CURSOR_SPRING = {
  type: "spring" as const,
  mass: 0.5,
  stiffness: 150,
  damping: 15,
};

const ENTRANCE_SPRING = {
  type: "spring" as const,
  mass: 1,
  stiffness: 200,
  damping: 18,
};

const ICON_OFFSET = 24; // Equal offset right and below cursor

interface CursorCollapseIconProps {
  onDismiss: () => void;
  children: React.ReactNode;
}

export function CursorCollapseIcon({ onDismiss, children }: CursorCollapseIconProps) {
  const [hovering, setHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = { x: e.clientX + ICON_OFFSET, y: e.clientY + ICON_OFFSET };
    setMousePos(pos);
    if (!hovering) {
      originRef.current = pos;
    }
  }, [hovering]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const pos = { x: e.clientX + ICON_OFFSET, y: e.clientY + ICON_OFFSET };
    originRef.current = pos;
    setMousePos(pos);
    setHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
  }, []);

  return (
    <div
      className="absolute inset-0 cursor-pointer"
      onClick={onDismiss}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {hovering && (
          <motion.div
            className="pointer-events-none fixed z-50"
            initial={{
              x: originRef.current.x,
              y: originRef.current.y,
              scale: 0,
              opacity: 0,
            }}
            animate={{
              x: mousePos.x,
              y: mousePos.y,
              scale: 1,
              opacity: 1,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{
              x: CURSOR_SPRING,
              y: CURSOR_SPRING,
              scale: ENTRANCE_SPRING,
              opacity: { duration: 0.15 },
            }}
            style={{ left: 0, top: 0 }}
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-white shadow-lg">
              {/* Collapse / minimize icon — two inward arrows */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--text-dark)]"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
