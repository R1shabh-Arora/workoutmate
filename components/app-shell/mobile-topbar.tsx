import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { NotificationBell } from "./notification-bell";
import type { Tables } from "@/lib/types/database.types";

export function MobileTopBar({
  notifications,
  unreadCount,
}: {
  notifications: Tables<"notifications">[];
  unreadCount: number;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
      <Link href="/dashboard">
        <Logo />
      </Link>
      <NotificationBell initialNotifications={notifications} initialUnreadCount={unreadCount} />
    </header>
  );
}
