"use client";

import { Sidebar } from "./sidebar";
import { MobileTopBar } from "./mobile-topbar";
import { BottomNav } from "./bottom-nav";
import type { Tables } from "@/lib/types/database.types";

export function AppShell({
  firstName,
  avatarUrl,
  notifications,
  unreadCount,
  children,
}: {
  firstName: string;
  avatarUrl: string | null;
  notifications: Tables<"notifications">[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh">
      <Sidebar firstName={firstName} avatarUrl={avatarUrl} notifications={notifications} unreadCount={unreadCount} />
      <MobileTopBar notifications={notifications} unreadCount={unreadCount} />

      <div className="lg:pl-60">
        <main className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:min-h-svh lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
