import { rgbaToThumbHash, thumbHashToDataURL, thumbHashToAverageRGBA } from "thumbhash";

/**
 * Compute a ThumbHash + dominant color from an image file.
 * Downscales to ≤100px, extracts RGBA, encodes the hash, and derives the
 * average color — all on the client via OffscreenCanvas.
 */
export async function extractPlaceholderData(
  file: File
): Promise<{ thumbHash: string; dominantColor: string } | null> {
  if (!file.type.startsWith("image/")) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  // Downscale to fit within 100×100 while preserving aspect ratio
  const maxDim = 100;
  let { width: w, height: h } = bitmap;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  let canvas: OffscreenCanvas;
  try {
    canvas = new OffscreenCanvas(w, h);
  } catch {
    bitmap.close();
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, w, h);
  const hash = rgbaToThumbHash(w, h, imageData.data);

  // Base64-encode the hash for DB storage
  const thumbHash = btoa(String.fromCharCode(...hash));

  // Derive dominant color from the hash itself
  const avg = thumbHashToAverageRGBA(hash);
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  const dominantColor = `#${toHex(avg.r)}${toHex(avg.g)}${toHex(avg.b)}`;

  return { thumbHash, dominantColor };
}

/**
 * Decode a base64-encoded ThumbHash string to a data URL for rendering.
 * Pure computation — no canvas needed (the library generates a PNG internally).
 */
export function thumbHashToPlaceholderURL(base64Hash: string): string {
  const binary = atob(base64Hash);
  const hash = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    hash[i] = binary.charCodeAt(i);
  }
  return thumbHashToDataURL(hash);
}
