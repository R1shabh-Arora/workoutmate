import type { Metadata } from "next";
import { getFullProfile, requireUser } from "@/lib/data/profile";
import { PersonalSection } from "@/components/settings/personal-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { AiAppearanceSection } from "@/components/settings/ai-appearance-section";
import { DangerZoneSection } from "@/components/settings/danger-zone-section";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile, preferences } = await getFullProfile();
  const { supabase, user } = await requireUser();
  const { data: notificationPrefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, training preferences and account.</p>
      </div>

      <PersonalSection profile={profile} />
      <PreferencesSection preferences={preferences} />
      <AiAppearanceSection initialTone={profile.ai_coach_tone} />
      <NotificationsSection preferences={notificationPrefs} />
      <DangerZoneSection />
    </div>
  );
}
