"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getComments } from "@/lib/queries/comments";

export interface SourceRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommentData = any[];

interface ExpansionContextValue {
  sourceRect: SourceRect | null;
  postData: ExpandedPostData | null;
  closing: boolean;
  commentCache: Map<string, CommentData>;
  captureSource: (data: ExpandedPostData, rect: SourceRect) => void;
  prefetchComments: (postId: string) => void;
  startClose: (needsHistoryBack: boolean) => void;
  finishClose: () => void;
  clear: () => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  sourceRect: null,
  postData: null,
  closing: false,
  commentCache: new Map(),
  captureSource: () => {},
  prefetchComments: () => {},
  startClose: () => {},
  finishClose: () => {},
  clear: () => {},
});

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const [sourceRect, setSourceRect] = useState<SourceRect | null>(null);
  const [postData, setPostData] = useState<ExpandedPostData | null>(null);
  const [closing, setClosing] = useState(false);
  const [needsHistoryBack, setNeedsHistoryBack] = useState(false);
  const [commentCache, setCommentCache] = useState<Map<string, CommentData>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());

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

  const captureSource = useCallback((data: ExpandedPostData, rect: SourceRect) => {
    setPostData(data);
    setSourceRect(rect);
    setClosing(false);
  }, []);

  const startClose = useCallback((historyBack: boolean) => {
    setClosing(true);
    setNeedsHistoryBack(historyBack);
  }, []);

  const clear = useCallback(() => {
    setSourceRect(null);
    setPostData(null);
    setClosing(false);
    setNeedsHistoryBack(false);
  }, []);

  const finishClose = useCallback(() => {
    if (needsHistoryBack) {
      window.history.back();
    }
    clear();
  }, [needsHistoryBack, clear]);

  return (
    <ExpansionContext value={{
      sourceRect, postData, closing, commentCache,
      captureSource, prefetchComments, startClose, finishClose, clear,
    }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
