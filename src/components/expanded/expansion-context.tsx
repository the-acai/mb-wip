"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getComments } from "@/lib/queries/comments";

/** Minimal post data needed to render the expanded card immediately */
export interface ExpandedPostData {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    color: string | null;
  };
  imageUrl: string | null;
  /** Signed URL for the actual video file (for autoplay in overlay) */
  videoUrl?: string | null;
  /** Poster frame URL for the video */
  videoPosterUrl?: string | null;
  /** Timecode (seconds) to resume video from — captured on card click */
  videoStartTime?: number;
  /** width / height of the image area (e.g. 1.5 for 3:2, 0.667 for 2:3) */
  imageAspect: number;
  /** layoutId of the source card element — overlay matches this for FLIP. */
  layoutSource?: string;
  /** Base64-encoded ThumbHash for blurry placeholder */
  thumbHash?: string | null;
  /** Hex dominant color for instant background fill */
  dominantColor?: string | null;
}

interface CachedComment {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

type CommentData = CachedComment[];

function mergeCommentRows(existing: CommentData, incoming: CommentData): CommentData {
  const byId = new Map<string, CachedComment>();

  for (const comment of existing) {
    byId.set(comment.id, comment);
  }

  for (const comment of incoming) {
    const previous = byId.get(comment.id);
    byId.set(comment.id, previous ? { ...previous, ...comment } : comment);
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}

interface ExpansionContextValue {
  postData: ExpandedPostData | null;
  commentCache: Map<string, CommentData>;
  expand: (data: ExpandedPostData) => void;
  collapse: (historyAlreadyBack?: boolean) => void;
  prefetchComments: (postId: string) => void;
  upsertComment: (postId: string, comment: CachedComment) => void;
  removeComment: (postId: string, commentId: string) => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  postData: null,
  commentCache: new Map(),
  expand: () => {},
  collapse: () => {},
  prefetchComments: () => {},
  upsertComment: () => {},
  removeComment: () => {},
});

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const [postData, setPostData] = useState<ExpandedPostData | null>(null);
  const [commentCache, setCommentCache] = useState<Map<string, CommentData>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());
  const historyPushedRef = useRef(false);

  const prefetchComments = useCallback((postId: string) => {
    if (fetchingRef.current.has(postId)) return;
    fetchingRef.current.add(postId);
    const supabase = createClient();
    getComments(supabase, postId).then((data) => {
      if (data) {
        setCommentCache((prev) => {
          const next = new Map(prev);
          const current = next.get(postId) ?? [];
          next.set(postId, mergeCommentRows(current, data as CommentData));
          return next;
        });
      }
    });
  }, []);

  const upsertComment = useCallback((postId: string, comment: CachedComment) => {
    setCommentCache((prev) => {
      const next = new Map(prev);
      const current = next.get(postId) ?? [];
      next.set(postId, mergeCommentRows(current, [comment]));
      return next;
    });
  }, []);

  const removeComment = useCallback((postId: string, commentId: string) => {
    setCommentCache((prev) => {
      const next = new Map(prev);
      const current = next.get(postId);
      if (!current) return prev;
      next.set(
        postId,
        current.filter((comment) => comment.id !== commentId)
      );
      return next;
    });
  }, []);

  const expand = useCallback((data: ExpandedPostData) => {
    setPostData(data);
    window.history.pushState(null, "", `/post/${data.id}`);
    historyPushedRef.current = true;
    // Subtle haptic on supporting devices (mobile). No-op on desktop.
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([10, 5, 10]);
    }
  }, []);

  const collapse = useCallback((historyAlreadyBack = false) => {
    if (!historyAlreadyBack && historyPushedRef.current) {
      window.history.back();
    }
    historyPushedRef.current = false;
    setPostData(null);
  }, []);

  return (
    <ExpansionContext value={{
      postData, commentCache,
      expand, collapse, prefetchComments,
      upsertComment, removeComment,
    }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
