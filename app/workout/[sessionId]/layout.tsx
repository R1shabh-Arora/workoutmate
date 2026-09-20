import { requireUser } from "@/lib/data/profile";

// Deliberately outside the (app) shell group — the workout screen gets its
// own minimal, distraction-free chrome instead of the sidebar/bottom nav.
export default async function WorkoutLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-svh bg-background">{children}</div>;
}
