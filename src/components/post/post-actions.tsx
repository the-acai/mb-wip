"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { deletePost } from "@/lib/queries/posts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostActionsProps {
  postId: string;
  authorId: string;
}

export function PostActions({ postId, authorId }: PostActionsProps) {
  const { user } = useUser();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  // Owner-only — render nothing for everyone else.
  if (!user || user.id !== authorId) return null;

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      await deletePost(supabase, postId);
      router.push("/feed");
      router.refresh();
    } catch (err) {
      setDeleting(false);
      window.alert(
        err instanceof Error ? err.message : "Failed to delete post"
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Post actions"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreHorizontalIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={deleting}
          className="text-destructive focus:text-destructive"
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
          {deleting ? "Deleting…" : "Delete post"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
