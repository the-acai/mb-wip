import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PostMeta = {
  title: string | null;
  author:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
};

function pickAuthor(author: PostMeta["author"]) {
  if (!author) return null;
  return Array.isArray(author) ? author[0] ?? null : author;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let title = "Works in Progress";
  let authorName = "";

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("title, author:profiles!author_id(full_name, email)")
      .eq("id", id)
      .single<PostMeta>();

    if (data) {
      title = data.title ?? title;
      const a = pickAuthor(data.author);
      authorName = a?.full_name ?? a?.email ?? "";
    }
  } catch {
    // Fall back to generic branding if the request has no session / RLS denies.
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "80px",
          background: "#f5f1ea",
          color: "#1a1a1a",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.55,
          }}
        >
          Matchbox · Works in Progress
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "1040px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 32,
            opacity: 0.65,
          }}
        >
          {authorName ? `by ${authorName}` : "Creative experiments, live"}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
