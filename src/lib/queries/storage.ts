import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "experiment-assets";

export async function uploadFile(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  postId: string
) {
  const ext = file.name.split(".").pop();
  const filePath = `${userId}/${postId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return {
    file_path: data.path,
    mime_type: file.type,
    size_bytes: file.size,
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

export async function deleteFile(
  supabase: SupabaseClient,
  filePath: string
) {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw error;
}
