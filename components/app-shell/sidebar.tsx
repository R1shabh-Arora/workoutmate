"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/marketing/logo";
import { SIDEBAR_NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";

export function Sidebar({
  firstName,
  avatarUrl,
  notifications,
  unreadCount,
}: {
  firstName: string;
  avatarUrl: string | null;
  notifications: Tables<"notifications">[];
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <NotificationBell initialNotifications={notifications} initialUnreadCount={unreadCount} />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border p-3">
        <UserMenu firstName={firstName} avatarUrl={avatarUrl} />
        <ThemeToggle />
      </div>
    </aside>
  );
}
