import { ExpandedPostOverlay } from "@/components/expanded/expanded-post-overlay";

export default async function InterceptedPostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExpandedPostOverlay postId={id} />;
}
