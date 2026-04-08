import { SupabaseClient } from "@supabase/supabase-js";

export async function getAllTags(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

export async function searchTags(supabase: SupabaseClient, query: string) {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
}
