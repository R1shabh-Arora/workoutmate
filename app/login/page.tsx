import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4">
      <div className="bg-grid-fade absolute inset-0 -z-10" />

      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:left-6 sm:top-6"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome to WorkoutMate</h1>
          <p className="mt-2 text-balance text-sm text-muted-foreground">
            Sign in to get your personalised training plan and AI coach.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <GoogleSignInButton next={next} />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to WorkoutMate&apos;s Terms of Service and Privacy Policy.
          WorkoutMate provides general fitness guidance and is not a substitute for professional
          medical advice.
        </p>
      </div>
    </div>
  );
}
