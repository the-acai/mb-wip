import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { ExpansionProvider } from "@/components/expanded/expansion-context";
import { OverlayPortal } from "@/components/expanded/overlay-portal";
import { UploadModalProvider } from "@/components/upload/upload-modal-context";
import { UploadModalPortal } from "@/components/upload/upload-modal-portal";
import { LayoutGroupWrapper } from "@/components/layout-group-wrapper";
import { ShrinkingHeader } from "@/components/feed/shrinking-header";
import { BottomActionGroup } from "@/components/feed/bottom-action-group";
import { SearchPaletteProvider } from "@/components/feed/search-context";
import { FeedSearchPalette } from "@/components/feed/feed-search-palette";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  // Check if the current user needs onboarding
  let onboardingProps: {
    userName: string;
    userId: string;
    postCount: number;
  } | null = null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, onboarding_complete")
        .eq("id", user.id)
        .single(),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true }),
    ]);

    if (profile && !profile.onboarding_complete) {
      onboardingProps = {
        userName:
          profile.full_name ||
          profile.email.split("@")[0] ||
          "friend",
        userId: user.id,
        postCount: count ?? 0,
      };
    }
  }

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
        {/* Bottom-center action group: search trigger + SEND IT, springs
            out below the viewport when an experiment overlay is open. */}
        <BottomActionGroup />
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
    {onboardingProps && <OnboardingOverlay {...onboardingProps} />}
    </Providers>
  );
}
