import "server-only";
import { z } from "zod";
import { tool, type ToolSet } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database.types";
import { getActivePlan, getWorkoutDayByDow } from "@/lib/data/plan";
import { getExerciseHistory, getRecentSessions, getWeeklyStats, getCurrentStreak } from "@/lib/data/sessions";
import { getWeightHistory, getAllPRs, getVolumeInsight } from "@/lib/data/progress";
import { getSubstitutesForExercise } from "@/lib/data/substitutions";
import { findExerciseByName, findWorkoutExerciseByName } from "./exercise-lookup";
import { recommendProgression } from "@/lib/progress/progression";
import { proposeChange } from "./pending-change";
import { generatePlan } from "@/lib/generation/engine";
import type { FitnessGoal, SplitType, WorkoutDuration } from "@/lib/types/enums";
import { getDayOfWeekInTimezone } from "@/lib/date-tz";
import type { GenerationInput } from "@/lib/generation/types";

type DbClient = SupabaseClient<Database>;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function buildCoachTools(supabase: DbClient, profileId: string, conversationId: string | null): ToolSet {
  return {
    get_user_profile: tool({
      description: "Get the user's fitness profile: goals, experience, body stats, equipment, training preferences.",
      inputSchema: z.object({}),
      execute: async () => {
        const [{ data: profile }, { data: goals }, { data: prefs }, { data: limitations }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", profileId).single(),
          supabase.from("fitness_goals").select("goal, is_primary").eq("profile_id", profileId),
          supabase.from("training_preferences").select("*").eq("profile_id", profileId).maybeSingle(),
          supabase.from("physical_limitations").select("*").eq("profile_id", profileId).maybeSingle(),
        ]);
        return { profile, goals, preferences: prefs, limitations };
      },
    }),

    get_current_plan: tool({
      description: "Get the user's full weekly training plan: every day, its focus, and its exercises with sets/reps.",
      inputSchema: z.object({}),
      execute: async () => {
        const plan = await getActivePlan();
        if (!plan) return { hasPlan: false };
        return {
          hasPlan: true,
          name: plan.name,
          splitType: plan.split_type,
          daysPerWeek: plan.days_per_week,
          days: plan.days.map((d) => ({
            dayOfWeek: DAY_NAMES[d.day_of_week],
            name: d.name,
            isRestDay: d.is_rest_day,
            exercises: d.exercises.map((e) => ({
              name: e.exercise.name,
              sets: e.sets,
              repsMin: e.reps_min,
              repsMax: e.reps_max,
              restSeconds: e.rest_seconds,
              intensity: e.intensity_guidance,
            })),
          })),
        };
      },
    }),

    get_today_workout: tool({
      description: "Get today's specific workout (or confirm it's a rest day).",
      inputSchema: z.object({}),
      execute: async () => {
        const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", profileId).single();
        const plan = await getActivePlan();
        if (!plan) return { hasPlan: false };
        const today = getWorkoutDayByDow(plan, getDayOfWeekInTimezone(profile?.timezone ?? "UTC"));
        if (!today || today.is_rest_day) return { isRestDay: true };
        return {
          isRestDay: false,
          name: today.name,
          estimatedDurationMinutes: today.estimated_duration_minutes,
          exercises: today.exercises.map((e) => ({
            name: e.exercise.name,
            sets: e.sets,
            repsMin: e.reps_min,
            repsMax: e.reps_max,
            restSeconds: e.rest_seconds,
            intensity: e.intensity_guidance,
          })),
        };
      },
    }),

    get_workout_history: tool({
      description: "Get a summary of the user's recent completed workout sessions.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(8) }),
      execute: async ({ limit }) => {
        const sessions = await getRecentSessions(limit);
        return {
          sessions: sessions.map((s) => ({
            name: s.name,
            status: s.status,
            date: s.started_at.split("T")[0],
            durationMinutes: s.duration_seconds ? Math.round(s.duration_seconds / 60) : null,
            totalVolumeKg: s.total_volume_kg,
          })),
        };
      },
    }),

    get_exercise_history: tool({
      description: "Get the user's logged sets (weight, reps, RPE) for one specific exercise, most recent first.",
      inputSchema: z.object({ exerciseName: z.string().describe("e.g. 'bench press', 'squat'") }),
      execute: async ({ exerciseName }) => {
        const exercise = await findExerciseByName(supabase, exerciseName);
        if (!exercise) return { found: false };
        const logs = await getExerciseHistory(exercise.id, 15);
        return {
          found: true,
          exerciseName: exercise.name,
          logs: logs.map((l) => ({ date: l.completed_at.split("T")[0], weightKg: l.weight_kg, reps: l.reps, rpe: l.rpe })),
        };
      },
    }),

    get_progress: tool({
      description: "Get the user's overall progress: recent body-weight trend, a training-volume insight, and personal records.",
      inputSchema: z.object({}),
      execute: async () => {
        const [weight, prs, insight] = await Promise.all([getWeightHistory(60), getAllPRs(), getVolumeInsight()]);
        return {
          recentWeightEntries: weight.slice(-5).map((w) => ({ date: w.measured_at, weightKg: w.weight_kg })),
          volumeInsight: insight,
          recentPRs: prs.slice(0, 5).map((p) => ({ exercise: p.exercise?.name, type: p.record_type, value: p.value, unit: p.unit })),
        };
      },
    }),

    recommend_progression: tool({
      description: "Get a safe, data-based suggestion for whether to increase weight, hold, or deload on a specific exercise next session.",
      inputSchema: z.object({ exerciseName: z.string() }),
      execute: async ({ exerciseName }) => {
        const { exercise, workoutExercise } = await findWorkoutExerciseByName(supabase, profileId, exerciseName);
        if (!exercise) return { found: false };
        const rec = await recommendProgression(supabase, profileId, exercise.id, workoutExercise?.reps_min ?? null, workoutExercise?.reps_max ?? null);
        return { found: true, exerciseName: exercise.name, ...rec };
      },
    }),

    log_workout: tool({
      description:
        "Log a completed exercise the user reports verbally (e.g. 'I did squats, 100kg for 3 sets of 5'). Executes immediately — logging is additive and low-risk, unlike plan edits.",
      inputSchema: z.object({
        exerciseName: z.string(),
        sets: z.array(z.object({ reps: z.number().int().min(0).max(200), weightKg: z.number().min(0).max(500).nullable(), rpe: z.number().min(1).max(10).nullable() })),
      }),
      execute: async ({ exerciseName, sets }) => {
        const exercise = await findExerciseByName(supabase, exerciseName);
        if (!exercise) return { logged: false, reason: "Exercise not found in the library." };

        const { data: existingSession } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("profile_id", profileId)
          .eq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let sessionId = existingSession?.id;
        if (!sessionId) {
          const { data: newSession } = await supabase
            .from("workout_sessions")
            .insert({ profile_id: profileId, name: "Logged via AI Coach", status: "completed", completed_at: new Date().toISOString() })
            .select("id")
            .single();
          sessionId = newSession?.id;
        }
        if (!sessionId) return { logged: false, reason: "Could not create a session to log against." };

        const rows = sets.map((s, i) => ({
          session_id: sessionId!,
          exercise_id: exercise.id,
          set_number: i + 1,
          reps: s.reps,
          weight_kg: s.weightKg,
          rpe: s.rpe,
          is_completed: true,
        }));
        await supabase.from("set_logs").insert(rows);

        const totalVolume = sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * s.reps, 0);
        await supabase
          .from("workout_sessions")
          .update({ total_volume_kg: totalVolume })
          .eq("id", sessionId);

        return { logged: true, exerciseName: exercise.name, setsLogged: sets.length };
      },
    }),

    replace_exercise: tool({
      description:
        "Propose replacing one exercise in the plan with a suitable alternative (e.g. no barbell available). Does NOT apply the change — the user must confirm.",
      inputSchema: z.object({
        currentExerciseName: z.string(),
        workoutDayName: z.string().optional().describe("e.g. 'Push Day' — only needed if the exercise appears on multiple days"),
        preferredAlternativeName: z.string().optional(),
        reason: z.string().optional(),
      }),
      execute: async ({ currentExerciseName, workoutDayName, preferredAlternativeName, reason }) => {
        const { exercise, workoutExercise, day } = await findWorkoutExerciseByName(supabase, profileId, currentExerciseName, workoutDayName);
        if (!exercise || !workoutExercise || !day) {
          return { proposed: false, reason: "Couldn't find that exercise in the current plan." };
        }

        const { data: prefs } = await supabase.from("training_preferences").select("equipment").eq("profile_id", profileId).maybeSingle();
        const candidates = await getSubstitutesForExercise(exercise.id, { equipment: (prefs?.equipment as string[]) ?? [] });
        if (candidates.length === 0) {
          return { proposed: false, reason: "No suitable substitute found with the user's current equipment." };
        }

        const chosen = preferredAlternativeName
          ? (candidates.find((c) => c.name.toLowerCase().includes(preferredAlternativeName.toLowerCase())) ?? candidates[0]!)
          : candidates[0]!;

        const change = await proposeChange(
          supabase,
          profileId,
          conversationId,
          "replace_exercise",
          `Replace ${exercise.name} with ${chosen.name} on ${day.name}`,
          { workoutExerciseId: workoutExercise.id, fromExerciseName: exercise.name, toExerciseId: chosen.id, toExerciseName: chosen.name, dayName: day.name, reason: reason ?? null }
        );

        return { proposed: true, pendingChangeId: change.id, summary: change.summary, alternativeName: chosen.name };
      },
    }),

    update_workout: tool({
      description:
        "Propose changing the sets, rep range or rest time for a specific exercise in the plan (e.g. 'make Friday's squats easier'). Does NOT apply the change.",
      inputSchema: z.object({
        exerciseName: z.string(),
        workoutDayName: z.string().optional(),
        sets: z.number().int().min(1).max(8).optional(),
        repsMin: z.number().int().min(1).max(50).optional(),
        repsMax: z.number().int().min(1).max(50).optional(),
        restSeconds: z.number().int().min(0).max(600).optional(),
        reason: z.string().optional(),
      }),
      execute: async ({ exerciseName, workoutDayName, sets, repsMin, repsMax, restSeconds, reason }) => {
        const { exercise, workoutExercise, day } = await findWorkoutExerciseByName(supabase, profileId, exerciseName, workoutDayName);
        if (!exercise || !workoutExercise || !day) {
          return { proposed: false, reason: "Couldn't find that exercise in the current plan." };
        }

        const parts: string[] = [];
        if (sets) parts.push(`${sets} sets`);
        if (repsMin || repsMax) parts.push(`${repsMin ?? workoutExercise.reps_min}-${repsMax ?? workoutExercise.reps_max} reps`);
        if (restSeconds != null) parts.push(`${restSeconds}s rest`);

        const change = await proposeChange(
          supabase,
          profileId,
          conversationId,
          "update_workout",
          `Update ${exercise.name} on ${day.name} to ${parts.join(", ") || "new settings"}`,
          { workoutExerciseId: workoutExercise.id, sets: sets ?? null, repsMin: repsMin ?? null, repsMax: repsMax ?? null, restSeconds: restSeconds ?? null, reason: reason ?? null }
        );

        return { proposed: true, pendingChangeId: change.id, summary: change.summary };
      },
    }),

    move_workout: tool({
      description:
        "Propose moving a workout day to a different day of the week (e.g. 'move Wednesday's workout to Thursday'). Swaps places with whatever currently occupies the target day, including a rest day. Does NOT apply the change.",
      inputSchema: z.object({
        workoutDayName: z.string().describe("The workout to move, e.g. 'Push Day' or the weekday it's currently on, e.g. 'Wednesday'"),
        targetDayName: z.enum(DAY_NAMES as [string, ...string[]]).describe("The day of the week to move it to"),
      }),
      execute: async ({ workoutDayName, targetDayName }) => {
        const plan = await getActivePlan();
        if (!plan) return { proposed: false, reason: "No active plan found." };

        const sourceDay = plan.days.find(
          (d) =>
            d.name.toLowerCase().includes(workoutDayName.toLowerCase()) ||
            DAY_NAMES[d.day_of_week]?.toLowerCase() === workoutDayName.toLowerCase()
        );
        if (!sourceDay) return { proposed: false, reason: "Couldn't find that workout day in the current plan." };

        const targetDow = DAY_NAMES.indexOf(targetDayName);
        const targetDay = plan.days.find((d) => d.day_of_week === targetDow);
        if (!targetDay) return { proposed: false, reason: "Couldn't find the target day in the current plan." };
        if (sourceDay.id === targetDay.id) return { proposed: false, reason: "That workout is already on that day." };

        const summary = targetDay.is_rest_day
          ? `Move ${sourceDay.name} from ${DAY_NAMES[sourceDay.day_of_week]} to ${targetDayName}`
          : `Swap ${sourceDay.name} (${DAY_NAMES[sourceDay.day_of_week]}) with ${targetDay.name} (${targetDayName})`;

        const change = await proposeChange(supabase, profileId, conversationId, "move_workout", summary, {
          dayIdA: sourceDay.id,
          dayIdB: targetDay.id,
          fromDayName: sourceDay.name,
          toDayName: targetDay.name,
          toDayOfWeek: targetDayName,
        });

        return { proposed: true, pendingChangeId: change.id, summary: change.summary };
      },
    }),

    adjust_workout_duration: tool({
      description: "Propose shortening or lengthening a specific workout day (e.g. 'I only have 30 minutes today'). Does NOT apply the change.",
      inputSchema: z.object({ workoutDayName: z.string(), targetMinutes: z.number().int().min(10).max(180) }),
      execute: async ({ workoutDayName, targetMinutes }) => {
        const plan = await getActivePlan();
        const day = plan?.days.find((d) => !d.is_rest_day && d.name.toLowerCase().includes(workoutDayName.toLowerCase()));
        if (!day) return { proposed: false, reason: "Couldn't find that workout day." };

        const current = day.estimated_duration_minutes ?? 0;
        const action = targetMinutes < current ? "trim" : targetMinutes > current ? "extend" : "keep as-is";

        const change = await proposeChange(
          supabase,
          profileId,
          conversationId,
          "adjust_duration",
          `${action === "trim" ? "Shorten" : action === "extend" ? "Extend" : "Keep"} ${day.name} to fit ~${targetMinutes} min (currently ~${current} min)`,
          { workoutDayId: day.id, targetMinutes, currentMinutes: current, action }
        );

        return { proposed: true, pendingChangeId: change.id, summary: change.summary };
      },
    }),

    change_training_days: tool({
      description: "Propose changing how many days per week the user trains (rebuilds the weekly split). Does NOT apply the change.",
      inputSchema: z.object({ newDaysPerWeek: z.number().int().min(1).max(7) }),
      execute: async ({ newDaysPerWeek }) => {
        const plan = await getActivePlan();
        const { data: profile } = await supabase.from("profiles").select("experience_level").eq("id", profileId).single();
        const { data: prefs } = await supabase.from("training_preferences").select("*").eq("profile_id", profileId).maybeSingle();
        const { data: goals } = await supabase.from("fitness_goals").select("goal, is_primary").eq("profile_id", profileId);
        const { data: limitations } = await supabase.from("physical_limitations").select("avoid_exercises").eq("profile_id", profileId).maybeSingle();

        if (!profile?.experience_level || !prefs) {
          return { proposed: false, reason: "Profile is incomplete." };
        }

        const primaryGoal = (goals?.find((g) => g.is_primary)?.goal ?? "improve_general_fitness") as FitnessGoal;
        const input: GenerationInput = {
          experienceLevel: profile.experience_level,
          primaryGoal,
          goals: (goals ?? []).map((g) => g.goal),
          daysPerWeek: newDaysPerWeek,
          preferredDays: prefs.preferred_days,
          workoutDuration: (prefs.workout_duration ?? "45_60") as WorkoutDuration,
          splitType: (prefs.split_type ?? "custom") as SplitType,
          trainingStyle: prefs.training_style ?? "mixed",
          cardioPreference: prefs.cardio_preference ?? "light",
          equipment: prefs.equipment as string[],
          preferredExercises: prefs.preferred_exercises,
          dislikedExercises: prefs.disliked_exercises,
          avoidExercises: limitations?.avoid_exercises ?? [],
        };

        const { data: exercisePool } = await supabase.from("exercises").select("*").eq("is_active", true);
        const newPlan = generatePlan(input, exercisePool ?? []);

        const change = await proposeChange(
          supabase,
          profileId,
          conversationId,
          "change_training_days",
          `Change training from ${plan?.days_per_week ?? "?"} to ${newDaysPerWeek} days/week — this rebuilds your weekly schedule`,
          { generatedPlan: newPlan } as unknown as Json
        );

        return { proposed: true, pendingChangeId: change.id, summary: change.summary };
      },
    }),

    rebuild_plan: tool({
      description: "Propose fully regenerating the training plan from the user's current profile and preferences (e.g. after goals changed significantly). Does NOT apply the change.",
      inputSchema: z.object({ reason: z.string() }),
      execute: async ({ reason }) => {
        const { data: profile } = await supabase.from("profiles").select("experience_level").eq("id", profileId).single();
        const { data: prefs } = await supabase.from("training_preferences").select("*").eq("profile_id", profileId).maybeSingle();
        const { data: goals } = await supabase.from("fitness_goals").select("goal, is_primary").eq("profile_id", profileId);
        const { data: limitations } = await supabase.from("physical_limitations").select("avoid_exercises").eq("profile_id", profileId).maybeSingle();

        if (!profile?.experience_level || !prefs || !prefs.days_per_week) {
          return { proposed: false, reason: "Profile is incomplete." };
        }

        const primaryGoal = (goals?.find((g) => g.is_primary)?.goal ?? "improve_general_fitness") as FitnessGoal;
        const input: GenerationInput = {
          experienceLevel: profile.experience_level,
          primaryGoal,
          goals: (goals ?? []).map((g) => g.goal),
          daysPerWeek: prefs.days_per_week,
          preferredDays: prefs.preferred_days,
          workoutDuration: (prefs.workout_duration ?? "45_60") as WorkoutDuration,
          splitType: (prefs.split_type ?? "custom") as SplitType,
          trainingStyle: prefs.training_style ?? "mixed",
          cardioPreference: prefs.cardio_preference ?? "light",
          equipment: prefs.equipment as string[],
          preferredExercises: prefs.preferred_exercises,
          dislikedExercises: prefs.disliked_exercises,
          avoidExercises: limitations?.avoid_exercises ?? [],
        };

        const { data: exercisePool } = await supabase.from("exercises").select("*").eq("is_active", true);
        const newPlan = generatePlan(input, exercisePool ?? []);

        const change = await proposeChange(
          supabase,
          profileId,
          conversationId,
          "rebuild_plan",
          `Rebuild your training plan — ${reason}`,
          { generatedPlan: newPlan } as unknown as Json
        );

        return { proposed: true, pendingChangeId: change.id, summary: change.summary };
      },
    }),
  };
}
