import { SupabaseClient } from "@supabase/supabase-js";
import { convertToWebp } from "@/lib/image-convert";
import { extractPlaceholderData } from "@/lib/thumb-hash";
import { extractVideoMetadata } from "@/lib/video-thumbnail";

const BUCKET = "experiment-assets";

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(null);
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadFile(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  postId: string
) {
  const isVideo = file.type.startsWith("video/");

  if (isVideo) {
    return uploadVideoFile(supabase, file, userId, postId);
  }

  // Convert raster images (JPEG, PNG) to WebP client-side
  const processed = await convertToWebp(file);

  const ext = processed.name.split(".").pop();
  const filePath = `${userId}/${postId}/${crypto.randomUUID()}.${ext}`;

  const [uploadResult, dimensions, placeholder] = await Promise.all([
    supabase.storage.from(BUCKET).upload(filePath, processed, {
      cacheControl: "3600",
      contentType: processed.type,
      upsert: false,
    }),
    getImageDimensions(processed),
    extractPlaceholderData(processed),
  ]);

  if (uploadResult.error) throw uploadResult.error;

  return {
    file_path: uploadResult.data.path,
    mime_type: processed.type,
    size_bytes: processed.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    thumb_hash: placeholder?.thumbHash ?? null,
    dominant_color: placeholder?.dominantColor ?? null,
    poster_path: null as string | null,
  };
}

async function uploadVideoFile(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  postId: string
) {
  const ext = file.name.split(".").pop();
  const uuid = crypto.randomUUID();
  const filePath = `${userId}/${postId}/${uuid}.${ext}`;

  // Extract poster frame + metadata in parallel with the video upload
  const [uploadResult, videoMeta] = await Promise.all([
    supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    }),
    extractVideoMetadata(file),
  ]);

  if (uploadResult.error) throw uploadResult.error;

  // Upload poster frame as a sibling WebP file
  let posterPath: string | null = null;
  if (videoMeta?.posterBlob) {
    const posterFilePath = `${userId}/${postId}/${uuid}_poster.webp`;
    const posterResult = await supabase.storage
      .from(BUCKET)
      .upload(posterFilePath, videoMeta.posterBlob, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      });
    if (!posterResult.error) {
      posterPath = posterResult.data.path;
    }
  }

  return {
    file_path: uploadResult.data.path,
    mime_type: file.type,
    size_bytes: file.size,
    width: videoMeta?.width ?? null,
    height: videoMeta?.height ?? null,
    thumb_hash: videoMeta?.thumbHash ?? null,
    dominant_color: videoMeta?.dominantColor ?? null,
    poster_path: posterPath,
  };
}

/**
 * Batch-fetch signed URLs for multiple file paths in a single request.
 * Returns a Map of filePath -> signedUrl.
 */
export async function getSignedUrls(
  supabase: SupabaseClient,
  filePaths: string[]
): Promise<Map<string, string>> {
  if (filePaths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(filePaths, 3600);

  if (error) throw error;

  const urlMap = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      urlMap.set(item.path, item.signedUrl);
    }
  }
  return urlMap;
}
