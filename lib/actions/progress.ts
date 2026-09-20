"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/data/profile";

const logWeightSchema = z.object({
  weightKg: z.number().min(20).max(400),
  measuredAt: z.string(),
  bodyFatPct: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(300).optional(),
});

/** Logs (or updates, if one already exists for that date) a body-weight entry. */
export async function logBodyWeight(input: z.infer<typeof logWeightSchema>) {
  const parsed = logWeightSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Please enter a valid weight.");
  }
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("body_measurements").upsert(
    {
      profile_id: user.id,
      weight_kg: parsed.data.weightKg,
      measured_at: parsed.data.measuredAt,
      body_fat_pct: parsed.data.bodyFatPct ?? null,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: "profile_id,measured_at" }
  );

  if (error) {
    console.error("[logBodyWeight] failed:", error.message);
    throw new Error("We couldn't save that entry. Please try again.");
  }

  revalidatePath("/progress");
  revalidatePath("/dashboard");
}
