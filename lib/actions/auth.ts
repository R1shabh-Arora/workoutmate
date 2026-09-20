"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Permanently deletes the signed-in user's account and every row that
 * references it (all fitness data cascades via ON DELETE CASCADE FKs).
 * Uses the service-role client only for the final admin.deleteUser call —
 * everything else runs as the user themselves.
 */
export async function deleteAccountAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[deleteAccountAction] failed:", error.message);
    throw new Error("We couldn't delete your account. Please try again or contact support.");
  }

  await supabase.auth.signOut();
  redirect("/");
}
