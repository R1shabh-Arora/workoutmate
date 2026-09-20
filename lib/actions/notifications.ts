"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/profile";

export async function markNotificationRead(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("profile_id", user.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}
