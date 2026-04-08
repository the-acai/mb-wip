import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { ExpansionProvider } from "@/components/expanded/expansion-context";
import { OverlayPortal } from "@/components/expanded/overlay-portal";

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
        <header className="relative px-6 pt-12 pb-6">
          <Link
            href="/post/new"
            className="group absolute right-6 top-[46px] flex items-center gap-0.5"
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
          <Link href="/feed">
            <h1 className="text-center font-heading text-[64px] font-black leading-[1.18] tracking-[-0.64px] text-[var(--text-dark)]">
              WORKS IN PROGRESS
            </h1>
          </Link>
        </header>
        <main className="px-6 pb-6">{children}</main>
        {modal}
        <OverlayPortal />
      </div>
    </TooltipProvider>
    </ExpansionProvider>
    </Providers>
  );
}
