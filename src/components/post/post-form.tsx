"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/lib/queries/posts";
import { uploadFile } from "@/lib/queries/storage";
import { searchTags } from "@/lib/queries/tags";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/post/media-uploader";
import { Loader2Icon, XIcon } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// --- Tag Input with autocomplete ---

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

function TagInput({ tags, onTagsChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch suggestions on input change
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchTags(supabase, inputValue.trim());
        const filtered = results.filter(
          (t: { name: string }) => !tags.includes(t.name)
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setHighlightedIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, tags]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addTag = useCallback(
    (tag: string) => {
      const normalized = tag.toLowerCase().trim();
      if (normalized && !tags.includes(normalized)) {
        onTagsChange([...tags, normalized]);
      }
      setInputValue("");
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [tags, onTagsChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [tags, onTagsChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        addTag(suggestions[highlightedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      tags.length > 0
    ) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setHighlightedIndex((i) =>
        i < suggestions.length - 1 ? i + 1 : 0
      );
    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setHighlightedIndex((i) =>
        i > 0 ? i - 1 : suggestions.length - 1
      );
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-[2rem] flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-full outline-none hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={tags.length === 0 ? "Add tags..." : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-muted text-foreground"
                  : "text-popover-foreground hover:bg-muted"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion.name);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Post Form ---

export function PostForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // We need a temporary post id for file uploads.
      // Create the post first without assets, then upload and update.
      // Actually, createPost handles assets as metadata -- we upload files first
      // and pass the metadata to createPost.
      const tempId = crypto.randomUUID();

      // Upload files
      const uploadedAssets = await Promise.all(
        files.map((file) => uploadFile(supabase, file, user.id, tempId))
      );

      // Create post with metadata
      const newPost = await createPost(supabase, {
        title: title.trim(),
        body: body || undefined,
        tags: tags.length > 0 ? tags : undefined,
        assets: uploadedAssets,
      });

      router.push(`/post/${newPost.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="What did you make?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Markdown editor */}
      <div className="space-y-2">
        <Label>Description</Label>
        <div data-color-mode="light" className="rounded-lg border">
          <MDEditor
            value={body}
            onChange={(val) => setBody(val ?? "")}
            preview="edit"
            height={300}
            hideToolbar={false}
            visibleDragbar={false}
          />
        </div>
      </div>

      {/* Media upload */}
      <div className="space-y-2">
        <Label>Media</Label>
        <MediaUploader files={files} onFilesChange={setFiles} />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput tags={tags} onTagsChange={setTags} />
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        size="lg"
        className="w-full text-base font-bold tracking-wide"
      >
        {isSubmitting ? (
          <>
            <Loader2Icon className="animate-spin" />
            Uploading...
          </>
        ) : (
          "SEND IT"
        )}
      </Button>
    </form>
  );
}
