"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useIsPresent } from "motion/react";

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
  const isPresent = useIsPresent();
  const hidden = !isPresent;
  const [hovering, setHovering] = useState(false);
  // Flips synchronously on click so the icon starts exiting the moment the
  // dismiss animation begins — we can't wait for isPresent to flip, since the
  // parent stays mounted for the full close duration.
  const [dismissed, setDismissed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // Captured at the moment hovering starts — read in motion.div initial,
  // which must come from state (not refs) per react-compiler rules.
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX + ICON_OFFSET, y: e.clientY + ICON_OFFSET });
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (dismissed) return;
    const pos = { x: e.clientX + ICON_OFFSET, y: e.clientY + ICON_OFFSET };
    setOrigin(pos);
    setMousePos(pos);
    setHovering(true);
  }, [dismissed]);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
  }, []);

  const handleClick = useCallback(() => {
    setDismissed(true);
    onDismiss();
  }, [onDismiss]);

  return (
    <div
      className={`absolute inset-0 ${hidden ? "pointer-events-none" : "cursor-pointer"}`}
      onClick={hidden ? undefined : handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {hovering && !hidden && !dismissed && (
          <motion.div
            className="pointer-events-none fixed z-50"
            initial={{
              x: origin.x,
              y: origin.y,
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
              transition: {
                scale: ENTRANCE_SPRING,
                // Mirror the entry: fade opacity during the last 0.15s of
                // the spring instead of the first, so the shrink stays
                // visible for most of the exit.
                opacity: { duration: 0.15, delay: 0.25 },
              },
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
