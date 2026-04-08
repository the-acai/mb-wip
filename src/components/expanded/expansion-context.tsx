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
  /** width / height of the image area (e.g. 1.5 for 3:2 landscape, 0.667 for 2:3 portrait) */
  imageAspect: number;
}

interface ExpansionContextValue {
  sourceRect: SourceRect | null;
  postData: ExpandedPostData | null;
  closing: boolean;
  captureSource: (data: ExpandedPostData, rect: SourceRect) => void;
  startClose: () => void;
  clear: () => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  sourceRect: null,
  postData: null,
  closing: false,
  captureSource: () => {},
  startClose: () => {},
  clear: () => {},
});

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const [sourceRect, setSourceRect] = useState<SourceRect | null>(null);
  const [postData, setPostData] = useState<ExpandedPostData | null>(null);
  const [closing, setClosing] = useState(false);

  const captureSource = useCallback((data: ExpandedPostData, rect: SourceRect) => {
    setPostData(data);
    setSourceRect(rect);
    setClosing(false);
  }, []);

  const startClose = useCallback(() => {
    setClosing(true);
  }, []);

  const clear = useCallback(() => {
    setSourceRect(null);
    setPostData(null);
    setClosing(false);
  }, []);

  return (
    <ExpansionContext value={{ sourceRect, postData, closing, captureSource, startClose, clear }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
