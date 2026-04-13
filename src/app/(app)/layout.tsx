import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { ExpansionProvider } from "@/components/expanded/expansion-context";
import { OverlayPortal } from "@/components/expanded/overlay-portal";
import { UploadModalProvider } from "@/components/upload/upload-modal-context";
import { UploadModalPortal } from "@/components/upload/upload-modal-portal";
import { LayoutGroupWrapper } from "@/components/layout-group-wrapper";
import { ShrinkingHeader } from "@/components/feed/shrinking-header";
import { SendItButton } from "@/components/feed/send-it-button";
import { SearchPaletteProvider } from "@/components/feed/search-context";
import { FeedSearchTrigger } from "@/components/feed/feed-search-trigger";
import { FeedSearchPalette } from "@/components/feed/feed-search-palette";

export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <Providers>
    <ExpansionProvider>
    <UploadModalProvider>
    <SearchPaletteProvider>
    <LayoutGroupWrapper>
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--page-bg)]">
        <ShrinkingHeader />
        <main className="px-6 pb-[calc(64px+4rem)]">{children}</main>
        {/* Bottom-center action group: search trigger sits 24px (gap-6)
            to the left of SEND IT, sharing one centered flex container so
            both stay visually paired regardless of viewport width. */}
        <div className="pointer-events-none fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-6">
          <FeedSearchTrigger />
          <SendItButton />
        </div>
        <FeedSearchPalette />
        {modal}
        <OverlayPortal />
        <UploadModalPortal />
      </div>
    </TooltipProvider>
    </LayoutGroupWrapper>
    </SearchPaletteProvider>
    </UploadModalProvider>
    </ExpansionProvider>
    </Providers>
  );
}
