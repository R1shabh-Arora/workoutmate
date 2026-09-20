import { requireOnboardedProfile } from "@/lib/data/profile";
import { getRecentNotifications } from "@/lib/data/notifications";
import { getPendingChangeCount } from "@/lib/data/coach";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, { notifications, unreadCount }, pendingChangeCount] = await Promise.all([
    requireOnboardedProfile(),
    getRecentNotifications(),
    getPendingChangeCount(),
  ]);

  return (
    <AppShell
      firstName={profile.first_name}
      avatarUrl={profile.avatar_url}
      notifications={notifications}
      unreadCount={unreadCount}
      pendingChangeCount={pendingChangeCount}
    >
      {children}
    </AppShell>
  );
}
