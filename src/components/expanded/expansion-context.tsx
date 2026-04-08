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
  /** width / height of the image area (e.g. 1.5 for 3:2, 0.667 for 2:3) */
  imageAspect: number;
}

interface ExpansionContextValue {
  sourceRect: SourceRect | null;
  postData: ExpandedPostData | null;
  closing: boolean;
  captureSource: (data: ExpandedPostData, rect: SourceRect) => void;
  /** Start close animation. Pass true if history.back() is needed after. */
  startClose: (needsHistoryBack: boolean) => void;
  /** Called when close animation finishes — clears state and optionally reverts URL. */
  finishClose: () => void;
  clear: () => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  sourceRect: null,
  postData: null,
  closing: false,
  captureSource: () => {},
  startClose: () => {},
  finishClose: () => {},
  clear: () => {},
});

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const [sourceRect, setSourceRect] = useState<SourceRect | null>(null);
  const [postData, setPostData] = useState<ExpandedPostData | null>(null);
  const [closing, setClosing] = useState(false);
  const [needsHistoryBack, setNeedsHistoryBack] = useState(false);

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
    <ExpansionContext value={{ sourceRect, postData, closing, captureSource, startClose, finishClose, clear }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
