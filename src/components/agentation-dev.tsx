"use client";

import { useSearchParams } from "next/navigation";
import { Agentation } from "agentation";

export function AgentationDev() {
  const searchParams = useSearchParams();
  if (searchParams.get("dev") !== "1") return null;
  return <Agentation endpoint="http://localhost:4747" />;
}
