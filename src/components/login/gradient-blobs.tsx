"use client";

import { useRef, useCallback } from "react";
import { useAnimationFrame, type MotionValue } from "motion/react";

const BLOBS = [
  { color: "#ff6b9d", size: 300, ampX: 60, ampY: 30, phase: 0 },
  { color: "#c471ed", size: 250, ampX: 40, ampY: 50, phase: 2.1 },
  { color: "#f7797d", size: 350, ampX: 50, ampY: 20, phase: 4.2 },
] as const;

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
    const opacity = 0.6 + p * 0.4;

    for (let i = 0; i < BLOBS.length; i++) {
      const el = blobRefs.current[i];
      if (!el) continue;
      const blob = BLOBS[i];
      const t = time * 0.001; // seconds
      const bx = Math.sin(t * speed * 0.3 + blob.phase) * blob.ampX;
      const by = Math.cos(t * speed * 0.2 + blob.phase * 1.3) * blob.ampY;
      el.style.transform = `translate(${bx}px, ${by}px) scale(${scale})`;
      el.style.opacity = String(opacity);
    }
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[400px] pointer-events-none overflow-hidden">
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          ref={setBlobRef(i)}
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            filter: "blur(80px)",
            mixBlendMode: "plus-lighter",
            bottom: -blob.size * 0.3,
            left: `calc(50% - ${blob.size / 2}px + ${(i - 1) * 80}px)`,
            opacity: 0.6,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
