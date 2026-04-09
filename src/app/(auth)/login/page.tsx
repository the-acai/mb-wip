"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMotionValue, useTransform } from "motion/react";

import { createClient } from "@/lib/supabase/client";
import { LoginCard } from "@/components/login/login-card";
import { GradientBlobs } from "@/components/login/gradient-blobs";

type Phase = "entering" | "idle" | "dragging" | "consuming";

const CARD_WIDTH = 216;
const CARD_HEIGHT = 379;

export default function LoginPage() {
  const [phase, setPhase] = useState<Phase>("entering");
  const windowHeightRef = useRef(typeof window !== "undefined" ? window.innerHeight : 900);

  // Measure window on mount and resize
  useEffect(() => {
    const update = () => { windowHeightRef.current = window.innerHeight; };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Distance from card's resting bottom edge to viewport bottom
  const distanceToBottom =
    windowHeightRef.current - (windowHeightRef.current / 2 + CARD_HEIGHT / 2);

  // Drag motion values — owned here, shared with card and blobs
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Proximity: 0 = card at rest, 1 = card bottom at viewport bottom
  const proximity = useTransform(y, [0, distanceToBottom], [0, 1], {
    clamp: true,
  });

  const handleConsume = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "matchboxstudio.com",
        },
      },
    });
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f7f8f8] flex items-center justify-center">
      <GradientBlobs proximity={proximity} />
      <LoginCard
        x={x}
        y={y}
        phase={phase}
        onPhaseChange={setPhase}
        onConsume={handleConsume}
        distanceToBottom={distanceToBottom}
      />
    </div>
  );
}
