"use client";

import { LayoutGroup } from "motion/react";

export function LayoutGroupWrapper({ children }: { children: React.ReactNode }) {
  return <LayoutGroup>{children}</LayoutGroup>;
}
