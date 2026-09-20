import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <Logo />
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          General fitness guidance only — not a substitute for professional medical advice.
        </p>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WorkoutMate. All rights reserved.
      </div>
    </footer>
  );
}
