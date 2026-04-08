import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/queries/posts";
import { getComments } from "@/lib/queries/comments";
import { getSignedUrl } from "@/lib/queries/storage";
import { ExpandedPostOverlay } from "@/components/expanded/expanded-post-overlay";

export default async function InterceptedPostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let post;
  try {
    post = await getPost(supabase, id);
  } catch {
    notFound();
  }
  if (!post) notFound();

  const comments = await getComments(supabase, id);

  const assetsWithUrls = await Promise.all(
    (post.assets ?? []).map(async (asset: { file_path: string; mime_type: string; width?: number; height?: number }) => {
      try {
        const signed_url = await getSignedUrl(supabase, asset.file_path);
        return { ...asset, signed_url };
      } catch {
        return { ...asset, signed_url: undefined };
      }
    })
  );

  const postWithUrls = { ...post, assets: assetsWithUrls };

  return <ExpandedPostOverlay post={postWithUrls} initialComments={comments || []} />;
}
