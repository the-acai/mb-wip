"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

/**
 * Returns the current user's profile color, cached via TanStack Query.
 *
 * When `serverColor` is provided (from the server layout's profile fetch),
 * it's used as initial data so the color is available on first render with
 * no flash.
 */
export function useProfileColor(serverColor?: string | null) {
  const { user } = useUser();

  const { data: color } = useQuery({
    queryKey: ["profile-color", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("color")
        .eq("id", user.id)
        .single();
      return data?.color ?? null;
    },
    enabled: !!user,
    initialData: serverColor ?? undefined,
    staleTime: Infinity,
  });

  return color ?? null;
}
