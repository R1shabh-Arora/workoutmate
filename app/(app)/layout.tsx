import { requireOnboardedProfile } from "@/lib/data/profile";
import { getRecentNotifications } from "@/lib/data/notifications";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, { notifications, unreadCount }] = await Promise.all([
    requireOnboardedProfile(),
    getRecentNotifications(),
  ]);

  return (
    <AppShell
      firstName={profile.first_name}
      avatarUrl={profile.avatar_url}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
