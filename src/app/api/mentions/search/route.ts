import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(5);

  if (error) {
    // Return an error shape so the client can distinguish "no matches" (200, [])
    // from a real failure. Previous behavior returned [] with status 500 which
    // looked like a successful empty result if status wasn't checked.
    return NextResponse.json(
      { error: error.message || "Failed to search mentions" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
