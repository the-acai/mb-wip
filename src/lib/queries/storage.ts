import { SupabaseClient } from "@supabase/supabase-js";

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
  const ext = file.name.split(".").pop();
  const filePath = `${userId}/${postId}/${crypto.randomUUID()}.${ext}`;

  const [uploadResult, dimensions] = await Promise.all([
    supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    }),
    getImageDimensions(file),
  ]);

  if (uploadResult.error) throw uploadResult.error;

  return {
    file_path: uploadResult.data.path,
    mime_type: file.type,
    size_bytes: file.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };
}

export async function getFileUrl(supabase: SupabaseClient, filePath: string) {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  return data;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  filePath: string
) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) throw error;
  return data.signedUrl;
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

export async function deleteFile(
  supabase: SupabaseClient,
  filePath: string
) {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw error;
}
