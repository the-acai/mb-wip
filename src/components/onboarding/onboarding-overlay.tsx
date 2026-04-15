"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { getAuthorColor } from "@/lib/utils";
import { AuthorPill } from "@/components/shared/author-pill";
import { ColorPicker } from "./color-picker";

type Phase =
  | "circle-entrance"
  | "color-picker"
  | "confirm-visible"
  | "morphing"
  | "greeting"
  | "fade-out";

interface OnboardingOverlayProps {
  userName: string;
  userId: string;
  postCount: number;
}

const CARD_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 140,
  damping: 18,
};

const FLIP_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const LAYOUT_ID = "onboarding-badge";

export function OnboardingOverlay({
  userName,
  userId,
  postCount,
}: OnboardingOverlayProps) {
  const [phase, setPhase] = useState<Phase>("circle-entrance");
  const [selectedColor, setSelectedColor] = useState(() =>
    getAuthorColor(userName),
  );
  const [visible, setVisible] = useState(true);
  const reducedMotion = useReducedMotion();
  const savedColorRef = useRef(false);

  // Listen for Enter key during color-picker / confirm-visible phases
  useEffect(() => {
    if (phase !== "color-picker" && phase !== "confirm-visible") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Save the chosen color (fire-and-forget)
        if (!savedColorRef.current) {
          savedColorRef.current = true;
          const supabase = createClient();
          supabase
            .from("profiles")
            .update({ color: selectedColor })
            .eq("id", userId)
            .then(() => {});
        }
        setPhase("morphing");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, selectedColor, userId]);

  // Transition from morphing → greeting after FLIP settles
  useEffect(() => {
    if (phase !== "morphing") return;
    const delay = reducedMotion ? 0 : 600;
    const t = setTimeout(() => setPhase("greeting"), delay);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  // Transition from greeting → fade-out after text animations
  useEffect(() => {
    if (phase !== "greeting") return;
    // "Howdy," at 0ms (800ms anim) + "There are..." at 400ms (800ms anim) + 1s pause
    const delay = reducedMotion ? 100 : 2200;
    const t = setTimeout(() => setPhase("fade-out"), delay);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  // Mark onboarding complete after fade-out
  const handleFadeOutComplete = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", userId)
      .then(() => {});
    setVisible(false);
  }, [userId]);

  const handleColorChange = useCallback((hex: string) => {
    setSelectedColor(hex);
  }, []);

  const handleDragStart = useCallback(() => {
    setPhase((prev) => (prev === "color-picker" ? "confirm-visible" : prev));
  }, []);

  const handleEntranceComplete = useCallback(() => {
    setPhase("color-picker");
  }, []);

  if (!visible) return null;

  const isPickerPhase =
    phase === "circle-entrance" ||
    phase === "color-picker" ||
    phase === "confirm-visible";

  // Viewport bg only fills with the selected color once the user starts dragging
  const overlayBg = phase === "confirm-visible" ? selectedColor : "#F7F8F8";

  return (
    <LayoutGroup id="onboarding">
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ backgroundColor: overlayBg }}
        animate={{
          backgroundColor: overlayBg,
          opacity: phase === "fade-out" ? 0 : 1,
        }}
        transition={
          phase === "fade-out"
            ? { duration: reducedMotion ? 0 : 0.6, ease: "easeOut" }
            : { duration: reducedMotion ? 0 : 0.4, ease: EASE_OUT_EXPO }
        }
        onAnimationComplete={() => {
          if (phase === "fade-out") handleFadeOutComplete();
        }}
      >
        {/* Phase 1-3: Color picker circle */}
        {isPickerPhase && (
          <ColorPicker
            layoutId={LAYOUT_ID}
            color={selectedColor}
            draggable={phase !== "circle-entrance"}
            onColorChange={handleColorChange}
            onDragStart={handleDragStart}
            onEntranceComplete={handleEntranceComplete}
          />
        )}

        {/* Phase 4-5: Tag pill + greeting — layoutId shared with circle for FLIP */}
        {!isPickerPhase && phase !== "fade-out" && (
          <div className="flex flex-col items-center gap-6">
            {/* "Howdy, @tag" row */}
            <div className="flex items-center gap-2">
              <motion.span
                initial={reducedMotion ? false : { y: 48, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: reducedMotion ? 0 : 0.8,
                  ease: EASE_OUT_EXPO,
                }}
                className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[var(--text-dark)]"
              >
                Howdy,
              </motion.span>

              <AuthorPill
                authorName={userName}
                backgroundColor={selectedColor}
                layoutId={LAYOUT_ID}
                transition={{ layout: FLIP_SPRING }}
              />
            </div>

            {/* "There are N works in progress." */}
            <motion.p
              initial={reducedMotion ? false : { y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: reducedMotion ? 0 : 0.8,
                ease: EASE_OUT_EXPO,
                delay: reducedMotion ? 0 : 0.4,
              }}
              className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[var(--text-dark)] text-center"
            >
              There are {postCount} works in progress.
            </motion.p>
          </div>
        )}

        {/* "⏎ to select" — springs in from below when user starts dragging */}
        <AnimatePresence>
          {phase === "confirm-visible" && (
            <motion.p
              key="hint"
              className="fixed bottom-[59px] left-1/2 -translate-x-1/2 font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#F7F8F8] text-center"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={CARD_SPRING}
            >
              ⏎ to select
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
