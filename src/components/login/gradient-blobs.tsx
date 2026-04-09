"use client";

import { useRef, useCallback } from "react";
import { useAnimationFrame, type MotionValue } from "motion/react";

// Each blob has 8 border-radius control points that morph independently
const BLOB_RADIUS_SPEEDS = [
  [0.31, 0.43, 0.37, 0.29, 0.41, 0.33, 0.39, 0.27],
  [0.29, 0.37, 0.41, 0.33, 0.27, 0.43, 0.31, 0.39],
  [0.37, 0.29, 0.33, 0.41, 0.39, 0.27, 0.43, 0.31],
] as const;

const BLOBS = [
  { color: "#ff2d78", size: 280, ampX: 80, ampY: 35, phase: 0, offsetX: -180 },
  { color: "#a033e0", size: 240, ampX: 50, ampY: 55, phase: 2.1, offsetX: 0 },
  { color: "#ff5533", size: 260, ampX: 65, ampY: 25, phase: 4.2, offsetX: 160 },
] as const;

function morphRadius(t: number, speeds: readonly number[]): string {
  // Generate 8 values between 30% and 70% for organic shapes
  const r = speeds.map((s, i) => {
    const val = Math.sin(t * s + i * 1.7) * 0.5 + 0.5; // 0-1
    return 30 + val * 40; // 30%-70%
  });
  return `${r[0]}% ${r[1]}% ${r[2]}% ${r[3]}% / ${r[4]}% ${r[5]}% ${r[6]}% ${r[7]}%`;
}

interface GradientBlobsProps {
  proximity: MotionValue<number>;
}

export function GradientBlobs({ proximity }: GradientBlobsProps) {
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setBlobRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    blobRefs.current[index] = el;
  }, []);

  useAnimationFrame((time) => {
    const p = proximity.get();
    const speed = 1 + p * 3;
    const scale = 1 + p * 0.3;
    const opacity = 0.7 + p * 0.3;
    const t = time * 0.001;

    for (let i = 0; i < BLOBS.length; i++) {
      const el = blobRefs.current[i];
      if (!el) continue;
      const blob = BLOBS[i];
      const bx = Math.sin(t * speed * 0.3 + blob.phase) * blob.ampX;
      const by = Math.cos(t * speed * 0.2 + blob.phase * 1.3) * blob.ampY;
      el.style.transform = `translate(${bx}px, ${by}px) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.borderRadius = morphRadius(t * speed, BLOB_RADIUS_SPEEDS[i]);
    }
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[500px] pointer-events-none overflow-hidden">
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          ref={setBlobRef(i)}
          className="absolute"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            filter: "blur(70px)",
            mixBlendMode: "plus-lighter",
            bottom: -blob.size * 0.2,
            left: `calc(50% - ${blob.size / 2}px + ${blob.offsetX}px)`,
            opacity: 0.7,
            borderRadius: "50%",
            willChange: "transform, opacity, border-radius",
          }}
        />
      ))}
    </div>
  );
}
