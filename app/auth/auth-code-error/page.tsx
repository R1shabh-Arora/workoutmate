import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign-in problem",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">We couldn&apos;t sign you in</h1>
      <p className="mt-2 max-w-sm text-balance text-sm text-muted-foreground">
        Something went wrong completing sign-in with Google. This is usually temporary — please try again.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/login">Try again</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
