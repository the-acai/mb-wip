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
  };
  imageUrl: string | null;
  /** width / height of the image area (e.g. 1.5 for 3:2, 0.667 for 2:3) */
  imageAspect: number;
  /** layoutId of the source card element — overlay matches this for FLIP. */
  layoutSource?: string;
  /** Base64-encoded ThumbHash for blurry placeholder */
  thumbHash?: string | null;
  /** Hex dominant color for instant background fill */
  dominantColor?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommentData = any[];

interface ExpansionContextValue {
  postData: ExpandedPostData | null;
  commentCache: Map<string, CommentData>;
  expand: (data: ExpandedPostData) => void;
  collapse: (historyAlreadyBack?: boolean) => void;
  prefetchComments: (postId: string) => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  postData: null,
  commentCache: new Map(),
  expand: () => {},
  collapse: () => {},
  prefetchComments: () => {},
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
        setCommentCache((prev) => new Map(prev).set(postId, data));
      }
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
    }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
