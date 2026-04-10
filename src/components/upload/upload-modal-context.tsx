"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type RefObject } from "react";
import { useExpansion } from "@/components/expanded/expansion-context";

interface UploadModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  buttonPillRef: RefObject<HTMLElement | null>;
}

const UploadModalContext = createContext<UploadModalContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  buttonPillRef: { current: null },
});

export function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { postData, collapse } = useExpansion();
  const buttonPillRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (postData) collapse();
    setIsOpen(true);
  }, [postData, collapse]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <UploadModalContext value={{ isOpen, open, close, buttonPillRef }}>
      {children}
    </UploadModalContext>
  );
}

export function useUploadModal() {
  return useContext(UploadModalContext);
}
