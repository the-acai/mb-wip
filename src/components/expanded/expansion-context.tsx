"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface SourceRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ExpansionContextValue {
  sourceRect: SourceRect | null;
  postId: string | null;
  captureSource: (postId: string, rect: SourceRect) => void;
  clear: () => void;
}

const ExpansionContext = createContext<ExpansionContextValue>({
  sourceRect: null,
  postId: null,
  captureSource: () => {},
  clear: () => {},
});

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const [sourceRect, setSourceRect] = useState<SourceRect | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  const captureSource = useCallback((id: string, rect: SourceRect) => {
    setPostId(id);
    setSourceRect(rect);
  }, []);

  const clear = useCallback(() => {
    setSourceRect(null);
    setPostId(null);
  }, []);

  return (
    <ExpansionContext value={{ sourceRect, postId, captureSource, clear }}>
      {children}
    </ExpansionContext>
  );
}

export function useExpansion() {
  return useContext(ExpansionContext);
}
