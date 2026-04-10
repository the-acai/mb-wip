import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { ExpansionProvider } from "@/components/expanded/expansion-context";
import { OverlayPortal } from "@/components/expanded/overlay-portal";
import { UploadModalProvider } from "@/components/upload/upload-modal-context";
import { UploadModalPortal } from "@/components/upload/upload-modal-portal";
import { LayoutGroupWrapper } from "@/components/layout-group-wrapper";
import { ShrinkingHeader } from "@/components/feed/shrinking-header";
import { SendItButton } from "@/components/feed/send-it-button";

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
    <LayoutGroupWrapper>
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--page-bg)]">
        <ShrinkingHeader />
        <main className="px-6 pb-[calc(64px+4rem)]">{children}</main>
        <SendItButton />
        {modal}
        <OverlayPortal />
        <UploadModalPortal />
      </div>
    </TooltipProvider>
    </LayoutGroupWrapper>
    </UploadModalProvider>
    </ExpansionProvider>
    </Providers>
  );
}
