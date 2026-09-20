"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./google-icon";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next) redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (error) {
      setError("We couldn't start Google sign-in. Please try again.");
      setLoading(false);
    }
    // On success the browser is redirected to Google — nothing else to do here.
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="lg"
        onClick={handleSignIn}
        disabled={loading}
        className="w-full border-border bg-card"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon className="size-4" />}
        Continue with Google
      </Button>
      {error && <p className="text-center text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
