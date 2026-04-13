"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useExpansion } from "@/components/expanded/expansion-context";

interface SearchPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SearchPaletteContext = createContext<SearchPaletteContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { postData, collapse } = useExpansion();

  const open = useCallback(() => {
    // If a card is currently expanded, collapse it first so the palette has a
    // clean visual stage.
    if (postData) collapse();
    setIsOpen(true);
  }, [postData, collapse]);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Cmd/Ctrl+K to toggle.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <SearchPaletteContext value={{ isOpen, open, close, toggle }}>
      {children}
    </SearchPaletteContext>
  );
}

export function useSearchPalette() {
  return useContext(SearchPaletteContext);
}
