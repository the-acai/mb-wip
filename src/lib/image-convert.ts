const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.8;

const SKIP_TYPES = new Set([
  "image/svg+xml",
  "image/gif",
  "image/webp",
]);

/**
 * Convert a raster image (JPEG, PNG) to WebP using the Canvas API.
 * Scales down to fit within MAX_DIMENSION while preserving aspect ratio.
 * Returns the original file for SVGs, GIFs, WebPs, and non-images.
 */
export async function convertToWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || SKIP_TYPES.has(file.type)) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob;
  try {
    blob = await canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
  } catch {
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, ".webp");
  return new File([blob], name, { type: "image/webp" });
}
