"use client";

import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useUploadModal } from "./upload-modal-context";
import { UploadModalOverlay } from "./upload-modal-overlay";

export function UploadModalPortal() {
  const { isOpen, close } = useUploadModal();

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && <UploadModalOverlay key="upload-modal" />}
    </AnimatePresence>
  );
}
