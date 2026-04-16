"use client";

import { useState, useEffect, useCallback } from "react";
import { useMotionValue, useTransform } from "motion/react";

import { createClient } from "@/lib/supabase/client";
import { LoginCard } from "@/components/login/login-card";
import { GradientBlobs } from "@/components/login/gradient-blobs";

type Phase = "entering" | "idle" | "dragging" | "consuming";

const CARD_HEIGHT = 379;

export default function LoginPage() {
  const [phase, setPhase] = useState<Phase>("entering");
  // Track viewport height in state so derived values can be read in render
  // without violating the no-refs-in-render rule.
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 900
  );

  useEffect(() => {
    const update = () => setWindowHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Distance from card's resting bottom edge to viewport bottom
  const distanceToBottom = windowHeight - (windowHeight / 2 + CARD_HEIGHT / 2);

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
    <div className="fixed inset-0 overflow-hidden bg-[var(--page-bg)] flex items-center justify-center">
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
