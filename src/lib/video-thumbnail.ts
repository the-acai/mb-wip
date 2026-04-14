import { rgbaToThumbHash, thumbHashToAverageRGBA } from "thumbhash";

export interface VideoMetadata {
  width: number;
  height: number;
  posterBlob: Blob;
  thumbHash: string;
  dominantColor: string;
}

/**
 * Extract a poster frame, dimensions, ThumbHash, and dominant color from a
 * video file entirely client-side using a hidden <video> + OffscreenCanvas.
 *
 * Seeks past the very first frame to avoid black leader frames, then captures
 * a still as WebP. The ThumbHash / dominant color pipeline mirrors the image
 * path in thumb-hash.ts so the data is interchangeable.
 */
export async function extractVideoMetadata(
  file: File
): Promise<VideoMetadata | null> {
  const url = URL.createObjectURL(file);
  try {
    return await extractFromObjectURL(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extractFromObjectURL(url: string): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.onloadedmetadata = () => {
      const { videoWidth: width, videoHeight: height, duration } = video;
      if (!width || !height) {
        cleanup();
        resolve(null);
        return;
      }

      // Seek past potential black leader — 10% in or 1s, whichever is smaller
      video.currentTime = Math.min(1, duration * 0.1);

      video.onseeked = async () => {
        try {
          const result = await captureFrame(video, width, height);
          cleanup();
          resolve(result);
        } catch {
          cleanup();
          resolve(null);
        }
      };
    };

    video.src = url;
  });
}

async function captureFrame(
  video: HTMLVideoElement,
  width: number,
  height: number
): Promise<VideoMetadata> {
  // Full-res poster
  const posterCanvas = new OffscreenCanvas(width, height);
  const posterCtx = posterCanvas.getContext("2d")!;
  posterCtx.drawImage(video, 0, 0, width, height);
  const posterBlob = await posterCanvas.convertToBlob({
    type: "image/webp",
    quality: 0.8,
  });

  // Downscale for ThumbHash (max 100px, same as thumb-hash.ts)
  const maxDim = 100;
  let tw = width;
  let th = height;
  if (tw > maxDim || th > maxDim) {
    const scale = maxDim / Math.max(tw, th);
    tw = Math.round(tw * scale);
    th = Math.round(th * scale);
  }

  const thumbCanvas = new OffscreenCanvas(tw, th);
  const thumbCtx = thumbCanvas.getContext("2d")!;
  thumbCtx.drawImage(video, 0, 0, tw, th);
  const imageData = thumbCtx.getImageData(0, 0, tw, th);

  const hash = rgbaToThumbHash(tw, th, imageData.data);
  const thumbHash = btoa(String.fromCharCode(...hash));

  const avg = thumbHashToAverageRGBA(hash);
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  const dominantColor = `#${toHex(avg.r)}${toHex(avg.g)}${toHex(avg.b)}`;

  return { width, height, posterBlob, thumbHash, dominantColor };
}
