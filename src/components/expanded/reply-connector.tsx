"use client";

import { useEffect, useRef, useState, useId } from "react";
import { motion, useReducedMotion } from "motion/react";

const LINE_SPRING = {
  type: "spring" as const,
  mass: 1.44,
  stiffness: 170,
  damping: 16,
};

const CORNER_RADIUS = 16;
const STROKE_WIDTH = 2;
const PARENT_AVATAR_CX = 18; // size-9 / 2
const PARENT_AVATAR_BOTTOM = 36; // size-9
const CHILD_AVATAR_LEFT = 48; // ml-12

interface ChildEntry {
  id: string;
  color: string;
}

interface ReplyConnectorProps {
  parentColor: string;
  childEntries: ChildEntry[];
  delay?: number;
}

interface ChildPosition {
  id: string;
  color: string;
  cy: number; // center Y relative to the parent wrapper
}

export function ReplyConnector({
  parentColor,
  childEntries,
  delay = 0,
}: ReplyConnectorProps) {
  const svgId = useId();
  const markerRef = useRef<HTMLDivElement>(null);
  const [children, setChildren] = useState<ChildPosition[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // The marker div sits inside the parent's motion.div.relative.
    // Walk up to find that container.
    const container = markerRef.current?.parentElement;
    if (!container) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const positions: ChildPosition[] = [];

      for (const entry of childEntries) {
        const el = container.querySelector(
          `[data-reply-avatar="${CSS.escape(entry.id)}"]`
        );
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        positions.push({
          id: entry.id,
          color: entry.color,
          cy: rect.top - containerRect.top + rect.height / 2,
        });
      }

      setChildren(positions);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [childEntries]);

  if (children.length === 0) return <div ref={markerRef} className="hidden" />;

  const isSingleChild = children.length === 1;
  const lastChildCY = children[children.length - 1].cy;

  // SVG viewBox dimensions — covers from parent avatar to the last child
  const svgWidth = CHILD_AVATAR_LEFT + STROKE_WIDTH;
  const svgHeight = lastChildCY + STROKE_WIDTH;

  return (
    <>
      <div ref={markerRef} className="hidden" />
      <svg
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: svgWidth, height: svgHeight }}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {isSingleChild ? (
            // Single child: gradient along the full L-path
            <linearGradient
              id={`${svgId}-grad`}
              gradientUnits="userSpaceOnUse"
              x1={PARENT_AVATAR_CX}
              y1={PARENT_AVATAR_BOTTOM}
              x2={CHILD_AVATAR_LEFT}
              y2={children[0].cy}
            >
              <stop offset="0%" style={{ stopColor: parentColor }} />
              <stop
                offset="50%"
                style={{
                  stopColor: `color-mix(in oklch, ${parentColor} 50%, ${children[0].color})`,
                }}
              />
              <stop
                offset="100%"
                style={{ stopColor: children[0].color }}
              />
            </linearGradient>
          ) : (
            // Multiple children: per-branch gradients
            children.map((child) => (
              <linearGradient
                key={child.id}
                id={`${svgId}-branch-${child.id}`}
                gradientUnits="userSpaceOnUse"
                x1={PARENT_AVATAR_CX}
                y1={child.cy - CORNER_RADIUS}
                x2={CHILD_AVATAR_LEFT}
                y2={child.cy}
              >
                <stop offset="0%" style={{ stopColor: parentColor }} />
                <stop
                  offset="100%"
                  style={{
                    stopColor: `color-mix(in oklch, ${parentColor} 30%, ${child.color})`,
                  }}
                />
              </linearGradient>
            ))
          )}
        </defs>

        {isSingleChild ? (
          // Single L-shaped path
          <motion.path
            d={buildLPath(
              PARENT_AVATAR_CX,
              PARENT_AVATAR_BOTTOM,
              CHILD_AVATAR_LEFT,
              children[0].cy,
              CORNER_RADIUS
            )}
            stroke={`url(#${svgId}-grad)`}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...LINE_SPRING, delay }}
          />
        ) : (
          <>
            {/* Vertical trunk in parent color */}
            <motion.path
              d={`M ${PARENT_AVATAR_CX} ${PARENT_AVATAR_BOTTOM} V ${lastChildCY}`}
              stroke={parentColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ ...LINE_SPRING, delay }}
            />
            {/* Horizontal branches with arced corners */}
            {children.map((child, i) => (
              <motion.path
                key={child.id}
                d={buildBranchPath(
                  PARENT_AVATAR_CX,
                  child.cy,
                  CHILD_AVATAR_LEFT,
                  CORNER_RADIUS
                )}
                stroke={`url(#${svgId}-branch-${child.id})`}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  ...LINE_SPRING,
                  delay: delay + 0.08 * (i + 1),
                }}
              />
            ))}
          </>
        )}
      </svg>
    </>
  );
}

/** Full L-shaped path from parent avatar bottom to child avatar left edge. */
function buildLPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  r: number
): string {
  return [
    `M ${startX} ${startY}`,
    `V ${endY - r}`,
    `A ${r} ${r} 0 0 1 ${startX + r} ${endY}`,
    `H ${endX}`,
  ].join(" ");
}

/** Branch path: arc from trunk + horizontal to child avatar. */
function buildBranchPath(
  trunkX: number,
  childY: number,
  endX: number,
  r: number
): string {
  return [
    `M ${trunkX} ${childY - r}`,
    `A ${r} ${r} 0 0 1 ${trunkX + r} ${childY}`,
    `H ${endX}`,
  ].join(" ");
}
