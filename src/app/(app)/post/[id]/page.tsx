import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/queries/posts";
import { getComments } from "@/lib/queries/comments";
import { getSignedUrls } from "@/lib/queries/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/post/markdown-renderer";
import { MediaGallery } from "@/components/post/media-gallery";
import { ShareButton } from "@/components/post/share-button";
import { PostActions } from "@/components/post/post-actions";
import { ReactionPicker } from "@/components/reactions/reaction-picker";
import { CommentThread } from "@/components/comments/comment-thread";

interface PostData {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  author_id: string;
  author: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
  } | null;
  assets: {
    file_path: string;
    mime_type: string;
    display_order: number;
    width?: number | null;
    height?: number | null;
  }[];
  post_tags: { tag: { id: string; name: string } }[];
  reactions: {
    id: string;
    user_id: string;
    emoji: string;
  }[];
}

type PostMetaRow = {
  title: string | null;
  body: string | null;
  author:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
};

function pickAuthor(author: PostMetaRow["author"]) {
  if (!author) return null;
  return Array.isArray(author) ? author[0] ?? null : author;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("title, body, author:profiles!author_id(full_name, email)")
      .eq("id", id)
      .single<PostMetaRow>();

    if (!data) return { title: "Post not found" };

    const author = pickAuthor(data.author);
    const authorName = author?.full_name ?? author?.email ?? "someone";
    const rawDescription = (data.body ?? "").replace(/\s+/g, " ").trim();
    const description =
      rawDescription.slice(0, 200) || `An experiment by ${authorName}`;
    const title = `${data.title ?? "Untitled"} — Works in Progress`;
    const ogUrl = `/api/og/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogUrl],
      },
    };
  } catch {
    return { title: "Works in Progress" };
  }
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let post: PostData;
  try {
    post = (await getPost(supabase, id)) as unknown as PostData;
  } catch {
    notFound();
  }

  if (!post) notFound();

  const comments = await getComments(supabase, id);

  // Current user — pass id to the reaction picker so it can highlight own
  // selections + gate the toggle on auth presence.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Batch-fetch signed URLs in a single storage API call instead of one request
  // per asset (fixes the N+1 flagged in audit issue #50).
  const assets = post.assets ?? [];
  const urlMap = assets.length
    ? await getSignedUrls(
        supabase,
        assets.map((a) => a.file_path)
      ).catch(() => new Map<string, string>())
    : new Map<string, string>();
  const assetsWithUrls = assets.map((asset) => ({
    ...asset,
    signed_url: urlMap.get(asset.file_path),
  }));

  const author = post.author;

  const tags = post.post_tags?.map((pt) => pt.tag);

  const authorName = author?.full_name ?? author?.email ?? "Unknown";
  const authorInitials = authorName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const createdAt = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl py-4">
      {/* Back / share row */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to feed
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton url={`/post/${id}`} title={post.title} />
          <PostActions postId={id} authorId={post.author_id} />
        </div>
      </div>

      {/* Header */}
      <article className="space-y-6">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>

          {/* Author info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {author?.avatar_url && (
                <AvatarImage src={author.avatar_url} alt={authorName} />
              )}
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{authorName}</p>
              <p className="text-xs text-muted-foreground">{createdAt}</p>
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <Separator />

        {/* Media */}
        {assetsWithUrls.length > 0 && (
          <MediaGallery assets={assetsWithUrls} />
        )}

        {/* Body */}
        {post.body && <MarkdownRenderer content={post.body} />}

        {/* Reactions — directly below body */}
        <ReactionPicker
          postId={id}
          initialReactions={post.reactions ?? []}
          currentUserId={user?.id}
        />

        <Separator />

        {/* Comments */}
        <CommentThread postId={id} initialComments={comments || []} />
      </article>
    </div>
  );
}
