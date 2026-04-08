import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AUTHOR_COLORS = ["#f84f11", "#9011f8", "#11a8f8", "#f811a8", "#11f84f", "#f8c811"];
const KNOWN_AUTHOR_COLORS: Record<string, string> = { kai: "#f84f11", brandon: "#9011f8" };

export function getAuthorColor(name: string): string {
  const key = name.toLowerCase().replace(/^@/, "");
  if (KNOWN_AUTHOR_COLORS[key]) return KNOWN_AUTHOR_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
}
