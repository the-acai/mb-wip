import { PostForm } from "@/components/post/post-form";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <Link
        href="/feed"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to feed
      </Link>

      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        Share an experiment
      </h1>

      <PostForm />
    </div>
  );
}
