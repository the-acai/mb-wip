import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/queries/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { FeedGrid } from "@/components/feed/feed-grid";
import type { FeedPost } from "@/components/feed/experiment-card";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // Fetch user's posts
  const { data: rawPosts } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!author_id(*),
      assets(*),
      post_tags(tag:tags(*)),
      comments(count),
      reactions(count)
    `
    )
    .eq("author_id", id)
    .order("created_at", { ascending: false });

  // Get signed URLs for thumbnails
  const posts: FeedPost[] = await Promise.all(
    ((rawPosts as FeedPost[]) || []).map(async (post) => {
      const firstImage = post.assets?.find((a) =>
        a.mime_type?.startsWith("image/")
      );
      if (firstImage) {
        try {
          firstImage.signed_url = await getSignedUrl(supabase, firstImage.file_path);
        } catch {
          // skip
        }
      }
      return post;
    })
  );

  const displayName = profile.full_name || profile.email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      <Link
        href="/feed"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          {profile.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          )}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {posts.length} {posts.length === 1 ? "experiment" : "experiments"}
          </p>
        </div>
      </div>

      <Separator className="mb-6" />

      {posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">No experiments yet</p>
        </div>
      ) : (
        <FeedGrid
          posts={posts}
          hasMore={false}
          loading={false}
          onLoadMore={() => {}}
        />
      )}
    </div>
  );
}
