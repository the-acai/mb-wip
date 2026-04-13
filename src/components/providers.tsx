"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5min default — most queries change rarely. Per-query overrides
            // exist for hot paths: useSearchPosts uses 30s, realtime-driven
            // queries (comments, reactions, notifications) get reconciled
            // by their dedicated realtime hooks instead of refetch.
            staleTime: 5 * 60_000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
