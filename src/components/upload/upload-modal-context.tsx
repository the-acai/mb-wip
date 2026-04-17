"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type RefObject } from "react";
import { useExpansion } from "@/components/expanded/expansion-context";

interface UploadModalContextValue {
  isOpen: boolean;
  isReturningEarly: boolean;
  open: () => void;
  close: () => void;
  startSearchReturn: () => void;
  buttonPillRef: RefObject<HTMLElement | null>;
}

const UploadModalContext = createContext<UploadModalContextValue>({
  isOpen: false,
  isReturningEarly: false,
  open: () => {},
  close: () => {},
  startSearchReturn: () => {},
  buttonPillRef: { current: null },
});

export function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReturningEarly, setIsReturningEarly] = useState(false);
  const { postData, collapse } = useExpansion();
  const buttonPillRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (postData) collapse();
    setIsReturningEarly(false);
    setIsOpen(true);
  }, [postData, collapse]);

  const close = useCallback(() => {
    setIsReturningEarly(false);
    setIsOpen(false);
  }, []);

  const startSearchReturn = useCallback(() => {
    setIsReturningEarly(true);
  }, []);

  return (
    <UploadModalContext
      value={{
        isOpen,
        isReturningEarly,
        open,
        close,
        startSearchReturn,
        buttonPillRef,
      }}
    >
      {children}
    </UploadModalContext>
  );
}

export function useUploadModal() {
  return useContext(UploadModalContext);
}
