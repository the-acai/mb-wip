"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchPalette } from "./search-context";
import { useSearchPosts } from "@/hooks/use-search-posts";
import { useExpansion, type ExpandedPostData } from "@/components/expanded/expansion-context";
import { getAuthorColor } from "@/lib/utils";
import type { FeedPost } from "./experiment-card";

export function FeedSearchPalette() {
  const { isOpen, close } = useSearchPalette();
  const { expand } = useExpansion();
  const [query, setQuery] = useState("");

  const { data, isFetching } = useSearchPosts(query);
  const results = data ?? [];

  const handleSelect = (post: FeedPost) => {
    close();
    setQuery("");
    const firstImage = post.assets?.find((a) => a.mime_type?.startsWith("image/"));
    const data: ExpandedPostData = {
      id: post.id,
      title: post.title,
      body: post.body,
      created_at: post.created_at,
      author: post.author,
      imageUrl: firstImage?.signed_url ?? null,
      imageAspect:
        firstImage?.width && firstImage?.height
          ? firstImage.width / firstImage.height
          : 3 / 2,
    };
    expand(data);
  };

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          close();
          setQuery("");
        }
      }}
      title="Search experiments"
      description="Find a post by title, body, or author"
    >
      {/* shouldFilter={false} — filtering happens server-side via search_posts RPC. */}
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search experiments…"
        />
        <CommandList>
        {query.trim().length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Type to search the feed.
          </p>
        ) : isFetching && results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : results.length === 0 ? (
          <CommandEmpty>No matches for &ldquo;{query.trim()}&rdquo;.</CommandEmpty>
        ) : (
          results.map((post) => {
            const firstImage = post.assets?.find((a) =>
              a.mime_type?.startsWith("image/")
            );
            const authorName =
              post.author?.full_name ||
              post.author?.email?.split("@")[0] ||
              "Anonymous";
            const badgeColor = getAuthorColor(authorName);
            return (
              <CommandItem
                key={post.id}
                value={`${post.id} ${post.title} ${authorName}`}
                onSelect={() => handleSelect(post)}
                className="flex items-center gap-3"
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {firstImage?.signed_url ? (
                    <Image
                      src={firstImage.signed_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center font-heading text-xs text-[var(--page-bg)]"
                      style={{ backgroundColor: badgeColor }}
                    >
                      @{authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-heading text-sm font-medium">
                    {post.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{authorName.toLowerCase()}
                  </span>
                </div>
              </CommandItem>
            );
          })
        )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
