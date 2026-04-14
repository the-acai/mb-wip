"use client";

import { useEffect, useRef, useState, useId } from "react";
import { motion, useReducedMotion } from "motion/react";

const LINE_SPRING = {
  type: "spring" as const,
  mass: 1.44,
  stiffness: 170,
  damping: 16,
};

const R = 16; // corner radius — matches comment card rounded-2xl
const SW = 2; // stroke width
const PARENT_CX = 18; // parent avatar center-X (size-9 / 2)
const PARENT_BOTTOM = 36; // parent avatar bottom edge (size-9)
const CHILD_LEFT = 48; // child avatar left edge (ml-12)

interface ChildEntry {
  id: string;
  color: string;
}

interface ReplyConnectorProps {
  parentColor: string;
  childEntries: ChildEntry[];
  delay?: number;
}

interface ChildPos {
  id: string;
  color: string;
  cy: number; // avatar center-Y relative to parent wrapper
}

export function ReplyConnector({
  parentColor,
  childEntries,
  delay = 0,
}: ReplyConnectorProps) {
  const svgId = useId();
  const markerRef = useRef<HTMLDivElement>(null);
  const [children, setChildren] = useState<ChildPos[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = markerRef.current?.parentElement;
    if (!container) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const positions: ChildPos[] = [];

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

  const last = children[children.length - 1];
  const svgW = CHILD_LEFT + SW;
  const svgH = last.cy + SW;

  // Main L-path: trunk from parent avatar → L-curve at last child → horizontal
  const mainPath = [
    `M ${PARENT_CX} ${PARENT_BOTTOM}`,
    `V ${last.cy - R}`,
    `A ${R} ${R} 0 0 1 ${PARENT_CX + R} ${last.cy}`,
    `H ${CHILD_LEFT}`,
  ].join(" ");

  // Non-last children get straight horizontal branches from the trunk
  const branches = children.slice(0, -1);

  return (
    <>
      <div ref={markerRef} className="hidden" />
      <svg
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: svgW, height: svgH }}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient for the main L-path */}
          <linearGradient
            id={`${svgId}-main`}
            gradientUnits="userSpaceOnUse"
            x1={PARENT_CX}
            y1={PARENT_BOTTOM}
            x2={CHILD_LEFT}
            y2={last.cy}
          >
            <stop offset="0%" style={{ stopColor: parentColor }} />
            <stop
              offset="50%"
              style={{
                stopColor: `color-mix(in oklch, ${parentColor} 50%, ${last.color})`,
              }}
            />
            <stop offset="100%" style={{ stopColor: last.color }} />
          </linearGradient>

          {/* Gradient per horizontal branch (non-last children) */}
          {branches.map((child) => (
            <linearGradient
              key={child.id}
              id={`${svgId}-b-${child.id}`}
              gradientUnits="userSpaceOnUse"
              x1={PARENT_CX}
              y1={child.cy}
              x2={CHILD_LEFT}
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
          ))}
        </defs>

        {/* Main L-path: trunk + curve + horizontal to last child */}
        <motion.path
          d={mainPath}
          stroke={`url(#${svgId}-main)`}
          strokeWidth={SW}
          strokeLinecap="round"
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ ...LINE_SPRING, delay }}
        />

        {/* Straight horizontal branches for non-last children */}
        {branches.map((child, i) => (
          <motion.path
            key={child.id}
            d={`M ${PARENT_CX} ${child.cy} H ${CHILD_LEFT}`}
            stroke={`url(#${svgId}-b-${child.id})`}
            strokeWidth={SW}
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...LINE_SPRING, delay: delay + 0.08 * (i + 1) }}
          />
        ))}
      </svg>
    </>
  );
}
