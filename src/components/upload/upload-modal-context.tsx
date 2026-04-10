"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type RefObject } from "react";
import { useExpansion } from "@/components/expanded/expansion-context";

interface UploadModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Ref to the SEND IT pill element — overlay reads its rect for the morph */
  buttonPillRef: RefObject<HTMLElement | null>;
  /** Bounding rects of each "SEND IT" char + arrow, captured on open */
  buttonCharRects: DOMRect[];
}

const UploadModalContext = createContext<UploadModalContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  buttonPillRef: { current: null },
  buttonCharRects: [],
});

export function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonCharRects, setButtonCharRects] = useState<DOMRect[]>([]);
  const { postData, collapse } = useExpansion();
  const buttonPillRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (postData) collapse();

    // Capture char rects from the button before opening
    if (buttonPillRef.current) {
      const chars = buttonPillRef.current.querySelectorAll("[data-char]");
      const rects = Array.from(chars).map((el) => el.getBoundingClientRect());
      setButtonCharRects(rects);
    }

    setIsOpen(true);
  }, [postData, collapse]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <UploadModalContext value={{ isOpen, open, close, buttonPillRef, buttonCharRects }}>
      {children}
    </UploadModalContext>
  );
}

export function useUploadModal() {
  return useContext(UploadModalContext);
}
