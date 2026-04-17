"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useSearchPalette } from "./search-context";
import { useUploadModal } from "@/components/upload/upload-modal-context";

export function FeedSearchTrigger() {
  const { open } = useSearchPalette();
  const { isOpen: uploadOpen } = useUploadModal();
  const [entered, setEntered] = useState(false);

  useEffect(() => setEntered(true), []);

  const hidden = !entered || uploadOpen;

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Search experiments (⌘K)"
      aria-keyshortcuts="Meta+K Control+K"
      className={`flex size-12 cursor-pointer items-center justify-center rounded-full bg-[var(--text-dark)] transition-[opacity,transform] duration-500 ease-out ${
        hidden
          ? "pointer-events-none translate-y-3 opacity-0"
          : "pointer-events-auto translate-y-0 opacity-100"
      }`}
      aria-hidden={hidden}
    >
      <SearchIcon className="size-5 text-[var(--page-bg)]" aria-hidden="true" />
    </button>
  );
}
