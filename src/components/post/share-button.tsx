"use client";

import { useState, useCallback } from "react";
import { ShareIcon, CheckIcon } from "lucide-react";

interface ShareButtonProps {
  /** Absolute or root-relative path to the post (e.g. /post/abc123) */
  url: string;
  /** Post title — used by the native share sheet */
  title: string;
}

export function ShareButton({ url, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const fullUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

    // Prefer the native share sheet on mobile / browsers that support it.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: fullUrl });
        return;
      } catch {
        // User cancelled or share unavailable — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — no fallback UI for now.
    }
  }, [url, title]);

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-live="polite"
      aria-label={copied ? "Link copied to clipboard" : "Share this post"}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <>
          <CheckIcon className="size-4" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <ShareIcon className="size-4" aria-hidden="true" />
          Share
        </>
      )}
    </button>
  );
}
