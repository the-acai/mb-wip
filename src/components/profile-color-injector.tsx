"use client";

import { useEffect } from "react";
import { useProfileColor } from "@/hooks/use-profile-color";

/**
 * Sets `--profile-color` on `<html>` so CSS focus rings (via `--ring`)
 * and any other style can reference the current user's chosen color.
 *
 * Accepts the server-fetched color as initial data to prevent flash.
 */
export function ProfileColorInjector({
  serverColor,
}: {
  serverColor?: string | null;
}) {
  const color = useProfileColor(serverColor);

  useEffect(() => {
    const html = document.documentElement;
    if (color) {
      html.style.setProperty("--profile-color", color);
      html.style.setProperty("--ring", color);
    }
    return () => {
      html.style.removeProperty("--profile-color");
      html.style.removeProperty("--ring");
    };
  }, [color]);

  return null;
}
