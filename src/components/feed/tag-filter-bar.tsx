"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SortMode } from "@/lib/queries/posts";

interface Tag {
  id: string;
  name: string;
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most_reactions", label: "Most Reactions" },
];

interface TagFilterBarProps {
  tags: Tag[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
}

export function TagFilterBar({
  tags,
  activeTag,
  onTagChange,
  sort,
  onSortChange,
}: TagFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onTagChange(null)}
          className="shrink-0"
        >
          <Badge
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeTag === null
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </Badge>
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() =>
              onTagChange(tag.name === activeTag ? null : tag.name)
            }
            className="shrink-0"
          >
            <Badge
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeTag === tag.name
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tag.name}
            </Badge>
          </button>
        ))}
      </div>

      {/* Sort selector */}
      <div className="flex shrink-0 gap-1 rounded-full bg-muted p-0.5">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              sort === option.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
