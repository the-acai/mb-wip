"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Tag {
  id: string;
  name: string;
}

interface TagFilterBarProps {
  tags: Tag[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export function TagFilterBar({ tags, activeTag, onTagChange }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          onClick={() => onTagChange(tag.name === activeTag ? null : tag.name)}
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
  );
}
