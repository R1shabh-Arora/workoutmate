"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav({ pendingChangeCount = 0 }: { pendingChangeCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showPendingBadge = item.href === "/coach" && pendingChangeCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <item.icon className={cn("size-5", active && "fill-primary/15")} strokeWidth={active ? 2.25 : 2} />
                {showPendingBadge && (
                  <span className="absolute -right-1.5 -top-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[0.5625rem] font-semibold text-primary-foreground">
                    {pendingChangeCount > 9 ? "9+" : pendingChangeCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
