import Link from "next/link";
import { Plus } from "lucide-react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/feed">
              <h1 className="text-xl font-bold tracking-tight">
                WORKS IN PROGRESS
              </h1>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/post/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                SEND IT
              </Link>
              <Link
                href="/post/new"
                className={cn(buttonVariants({ size: "icon-sm", variant: "outline" }))}
              >
                <Plus className="h-4 w-4" />
              </Link>
              <NotificationBell />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </TooltipProvider>
  );
}
