import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostRedirect } from "./post-redirect";

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

export default async function PostDetailPage() {
  return <PostRedirect />;
}
