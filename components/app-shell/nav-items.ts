import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, CalendarDays, LineChart, MessageCircle, Dumbbell, UserRound } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Full set, used by the desktop sidebar. */
export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "My Plan", icon: CalendarDays },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/coach", label: "AI Coach", icon: MessageCircle },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
];

/** Trimmed to the five most-used destinations — mobile bottom nav real estate is scarce. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/profile", label: "Profile", icon: UserRound },
];
