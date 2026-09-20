import { redirect } from "next/navigation";
import { getFullProfile } from "@/lib/data/profile";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getFullProfile();

  if (profile.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return children;
}
