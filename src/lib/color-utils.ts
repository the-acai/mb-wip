/**
 * Color utilities for the onboarding color picker.
 *
 * Maps a 2D drag position to an HSL color constrained to WCAG AA contrast
 * against #F7F8F8 (the badge text / page-bg color).
 */

const TEXT_HEX = "#F7F8F8";

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to a hex string. */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Parse a hex color to [r, g, b] in 0-255. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance for an sRGB channel value (0-255). */
function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance of an RGB color (0-255 per channel). */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** WCAG contrast ratio between two hex colors (always ≥ 1). */
export function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * If `hex` doesn't meet AA contrast (4.5:1) against `textHex`,
 * progressively darken the HSL lightness until it does.
 */
export function ensureAAContrast(hex: string, textHex: string = TEXT_HEX): string {
  if (contrastRatio(hex, textHex) >= 4.5) return hex;

  // Convert to HSL, reduce lightness until we pass
  const [r, g, b] = hexToRgb(hex);
  const rN = r / 255,
    gN = g / 255,
    bN = b / 255;
  const max = Math.max(rN, gN, bN),
    min = Math.min(rN, gN, bN);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rN) h = ((gN - bN) / delta + 6) % 6;
    else if (max === gN) h = (bN - rN) / delta + 2;
    else h = (rN - gN) / delta + 4;
    h *= 60;
  }

  const s = delta === 0 ? 0 : delta / (1 - Math.abs(max + min - 1));
  let l = ((max + min) / 2) * 100;

  // Darken until AA is met
  while (l > 0) {
    l -= 1;
    const candidate = hslToHex(h, s * 100, l);
    if (contrastRatio(candidate, textHex) >= 4.5) return candidate;
  }

  return "#000000";
}

/**
 * Map a drag offset (dx, dy from viewport center) to an AA-safe hex color.
 *
 * - Angle from center → hue (0–360)
 * - Distance from center → lightness (lighter at center, darker at edges)
 * - Saturation fixed at 80% for vibrant colors
 * - All results guaranteed AA (4.5:1) against #F7F8F8
 */
export function positionToColor(
  dx: number,
  dy: number,
  maxRadius: number,
): string {
  // Hue from angle (0° = right, rotates counter-clockwise)
  const angle = Math.atan2(-dy, dx);
  const hue = ((angle * 180) / Math.PI + 360) % 360;

  // Lightness: center = 42% (lightest AA-safe), edge = 18% (deep)
  const distance = Math.sqrt(dx * dx + dy * dy);
  const normalized = Math.min(distance / maxRadius, 1);
  const lightness = 42 - normalized * 24;

  const saturation = 80;
  const hex = hslToHex(hue, saturation, lightness);

  // Safety net for yellow/green hues where perceived lightness is higher
  return ensureAAContrast(hex);
}
