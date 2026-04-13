"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { deletePost, updatePost } from "@/lib/queries/posts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PostActionsProps {
  postId: string;
  authorId: string;
  initialTitle: string;
  initialBody: string | null;
}

export function PostActions({
  postId,
  authorId,
  initialTitle,
  initialBody,
}: PostActionsProps) {
  const { user } = useUser();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Post actions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
        >
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit post
          </DropdownMenuItem>
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

      <EditPostDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        postId={postId}
        initialTitle={initialTitle}
        initialBody={initialBody}
        onSaved={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  initialTitle: string;
  initialBody: string | null;
  onSaved: () => void;
}

function EditPostDialog({
  open,
  onOpenChange,
  postId,
  initialTitle,
  initialBody,
  onSaved,
}: EditPostDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    title.trim() !== initialTitle.trim() ||
    (body.trim() || null) !== (initialBody?.trim() || null);

  const handleSave = async () => {
    if (saving || !dirty || title.trim().length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      await updatePost(supabase, postId, { title, body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Reset draft when closing without saving
          setTitle(initialTitle);
          setBody(initialBody ?? "");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
          <DialogDescription>
            Update the title or body. Tags, assets, and visibility aren&rsquo;t
            editable here yet.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Title</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Body</span>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Markdown supported."
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty || title.trim().length === 0}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
