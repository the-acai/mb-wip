"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useExpansion } from "@/components/expanded/expansion-context";

interface UploadModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const UploadModalContext = createContext<UploadModalContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { postData, collapse } = useExpansion();

  const open = useCallback(() => {
    // Mutual exclusion: collapse expanded card if open
    if (postData) collapse();
    setIsOpen(true);
  }, [postData, collapse]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <UploadModalContext value={{ isOpen, open, close }}>
      {children}
    </UploadModalContext>
  );
}

export function useUploadModal() {
  return useContext(UploadModalContext);
}
