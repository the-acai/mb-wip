import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { ExpansionProvider } from "@/components/expanded/expansion-context";
import { OverlayPortal } from "@/components/expanded/overlay-portal";
import { ShrinkingHeader } from "@/components/feed/shrinking-header";

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
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--page-bg)]">
        <ShrinkingHeader />
        <main className="px-6 pb-[calc(64px+4rem)]">{children}</main>
        <Link
          href="/post/new"
          className="group fixed bottom-[4svh] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5"
        >
          <span className="inline-flex h-12 items-center overflow-hidden rounded-full bg-[var(--text-dark)] px-6 transition-[padding] duration-300 ease-out group-hover:px-8">
            {"SEND IT".split("").map((char, i) => (
              <span
                key={i}
                className="inline-block font-heading text-base font-bold text-[var(--page-bg)] group-hover:animate-[letter-bounce_600ms_ease-out]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--text-dark)]">
            <ArrowRight className="size-5 text-[var(--page-bg)]" />
          </span>
        </Link>
        {modal}
        <OverlayPortal />
      </div>
    </TooltipProvider>
    </ExpansionProvider>
    </Providers>
  );
}
