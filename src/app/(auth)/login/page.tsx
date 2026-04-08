"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "matchboxstudio.com",
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Works in Progress
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in with your Matchbox Studio account
          </p>
        </div>
        <Button onClick={handleLogin} size="lg" className="w-full">
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
