import { SupabaseClient } from "@supabase/supabase-js";

export async function searchTags(supabase: SupabaseClient, query: string) {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
}
