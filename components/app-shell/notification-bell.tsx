"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Bell, CheckCheck, Flame, MessageCircle, Sparkles, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  workout_reminder: <Dumbbell className="size-4" />,
  rest_day: <Sparkles className="size-4" />,
  weekly_review: <Sparkles className="size-4" />,
  streak: <Flame className="size-4" />,
  goal: <Sparkles className="size-4" />,
  system: <MessageCircle className="size-4" />,
};

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: Tables<"notifications">[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationRead(id);
  }

  async function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
          ) : (
            notifications.map((n) => {
              const content = (
                <div
                  className={cn(
                    "flex gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50",
                    !n.read_at && "bg-primary/[0.04]"
                  )}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {TYPE_ICONS[n.type] ?? <Bell className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );

              return n.action_url ? (
                <Link key={n.id} href={n.action_url} onClick={() => !n.read_at && handleMarkRead(n.id)}>
                  {content}
                </Link>
              ) : (
                <button key={n.id} type="button" className="block w-full" onClick={() => !n.read_at && handleMarkRead(n.id)}>
                  {content}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
