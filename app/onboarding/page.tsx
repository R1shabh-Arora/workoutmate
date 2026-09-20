import type { Metadata } from "next";
import { getFullProfile } from "@/lib/data/profile";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export const metadata: Metadata = {
  title: "Set up your profile",
};

export default async function OnboardingPage() {
  const { profile } = await getFullProfile();

  return <OnboardingShell initialFirstName={profile.first_name} />;
}
