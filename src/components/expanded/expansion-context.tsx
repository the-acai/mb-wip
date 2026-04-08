"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
}

interface ExpansionContextValue {
  sourceRect: SourceRect | null;
  postData: ExpandedPostData | null;
  captureSource: (data: ExpandedPostData, rect: SourceRect) => void;
  clear: () => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  sourceRect: null,
  postData: null,
  captureSource: () => {},
  clear: () => {},
});

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const [sourceRect, setSourceRect] = useState<SourceRect | null>(null);
  const [postData, setPostData] = useState<ExpandedPostData | null>(null);

  const captureSource = useCallback((data: ExpandedPostData, rect: SourceRect) => {
    setPostData(data);
    setSourceRect(rect);
  }, []);

  const clear = useCallback(() => {
    setSourceRect(null);
    setPostData(null);
  }, []);

  return (
    <ExpansionContext value={{ sourceRect, postData, captureSource, clear }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
