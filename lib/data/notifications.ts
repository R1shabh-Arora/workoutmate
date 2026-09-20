import "server-only";
import { requireUser } from "./profile";

export async function getRecentNotifications(limit = 8) {
  const { supabase, user } = await requireUser();
  const [{ data: notifications }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .is("read_at", null),
  ]);

  return { notifications: notifications ?? [], unreadCount: count ?? 0 };
}
