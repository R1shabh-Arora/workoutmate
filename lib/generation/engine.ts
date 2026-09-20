import type { Tables } from "@/lib/types/database.types";
import { DURATION_MINUTES, GOAL_LABELS, type FitnessGoal } from "@/lib/types/enums";
import type { GenerationInput, GeneratedDay, GeneratedExercise, GeneratedPlan } from "./types";
import { resolveDayTemplates, CARDIO_CORE } from "./split-templates";
import { resolveTrainingDays } from "./schedule";
import { buildPrescription, estimateSetSeconds } from "./prescription";
import { selectExercise, normalizeTerms } from "./exercise-selection";

const TRANSITION_SECONDS = 25;
const WARMUP_MINUTES = 6;

function estimateExerciseSeconds(ex: GeneratedExercise): number {
  if (ex.durationSeconds) {
    return ex.sets * (ex.durationSeconds + ex.restSeconds) + TRANSITION_SECONDS;
  }
  const perSet = estimateSetSeconds(ex.repsMax ?? 10) + ex.restSeconds;
  return ex.sets * perSet + TRANSITION_SECONDS;
}

/**
 * Builds a full weekly training plan for a profile, purely from structured
 * rules — split selection, exercise-library filtering, and goal/experience
 * based prescriptions. No AI model is involved in generating the numbers.
 */
export function generatePlan(input: GenerationInput, exercisePool: Tables<"exercises">[]): GeneratedPlan {
  const dayTemplates = resolveDayTemplates(input.splitType, input.daysPerWeek);
  const trainingDayNumbers = resolveTrainingDays(input.daysPerWeek, input.preferredDays);
  const targetMinutes = DURATION_MINUTES[input.workoutDuration];
  const targetSeconds = (targetMinutes - WARMUP_MINUTES) * 60;

  const availableEquipment = new Set(
    input.equipment.map((e) => (e.startsWith("other:") ? "other" : e))
  );
  const excludedTerms = normalizeTerms([...input.dislikedExercises, ...input.avoidExercises]);
  const preferredTerms = normalizeTerms(input.preferredExercises);

  const days: GeneratedDay[] = [];
  const allDayNumbers = [0, 1, 2, 3, 4, 5, 6];

  for (const dayOfWeek of allDayNumbers) {
    const trainingIndex = trainingDayNumbers.indexOf(dayOfWeek);
    if (trainingIndex === -1) {
      days.push({
        dayOfWeek,
        name: "Rest",
        isRestDay: true,
        focusMuscleGroups: [],
        estimatedDurationMinutes: 0,
        exercises: [],
      });
      continue;
    }

    const template = dayTemplates[trainingIndex]!;
    const isLastTrainingDay = trainingIndex === trainingDayNumbers.length - 1;
    const wantsCardioFinisher = isLastTrainingDay && (input.cardioPreference === "moderate" || input.cardioPreference === "high");

    const slots = wantsCardioFinisher ? [...template.slots, ...CARDIO_CORE.slots.slice(0, 1)] : template.slots;

    // Primary slots are never dropped; secondary/finisher slots fill the
    // remaining time budget in priority order.
    const ordered = [
      ...slots.filter((s) => s.priority === "primary"),
      ...slots.filter((s) => s.priority === "secondary"),
      ...slots.filter((s) => s.priority === "finisher"),
    ];

    const exercises: GeneratedExercise[] = [];
    const usedTodayIds = new Set<string>();
    let runningSeconds = 0;
    let orderIndex = 0;

    for (const slot of ordered) {
      const mustInclude = slot.priority === "primary";
      if (!mustInclude && runningSeconds >= targetSeconds) break;
      if (exercises.length >= 8) break;

      const picked = selectExercise({
        slot,
        pool: exercisePool,
        experience: input.experienceLevel,
        availableEquipment,
        excludedTerms,
        preferredTerms,
        usedTodayIds,
        seed: Math.floor(Math.random() * 1000),
      });
      if (!picked) continue;

      const isCompound = picked.movement_type === "compound";
      const prescription = buildPrescription(slot, input.trainingStyle, input.experienceLevel, isCompound);
      const isCardio = picked.movement_type === "cardio";

      const generated: GeneratedExercise = {
        exercise: picked,
        orderIndex: orderIndex++,
        isWarmup: false,
        sets: isCardio ? 1 : prescription.sets,
        repsMin: isCardio ? null : prescription.repsMin,
        repsMax: isCardio ? null : prescription.repsMax,
        durationSeconds: isCardio ? 15 * 60 : null,
        restSeconds: isCardio ? 0 : prescription.restSeconds,
        tempo: prescription.tempo,
        intensityGuidance: isCardio ? "Steady, conversational pace" : prescription.intensityGuidance,
        notes: null,
      };

      exercises.push(generated);
      usedTodayIds.add(picked.id);
      runningSeconds += estimateExerciseSeconds(generated);
    }

    // Guarantee at least four exercises when the library has options left —
    // an empty-feeling workout is worse than slightly running long.
    if (exercises.length < 4) {
      for (const slot of ordered) {
        if (exercises.length >= 4) break;
        const picked = selectExercise({
          slot,
          pool: exercisePool,
          experience: input.experienceLevel,
          availableEquipment,
          excludedTerms,
          preferredTerms,
          usedTodayIds,
          seed: Math.floor(Math.random() * 1000),
        });
        if (!picked) continue;
        const isCompound = picked.movement_type === "compound";
        const prescription = buildPrescription(slot, input.trainingStyle, input.experienceLevel, isCompound);
        exercises.push({
          exercise: picked,
          orderIndex: orderIndex++,
          isWarmup: false,
          sets: prescription.sets,
          repsMin: prescription.repsMin,
          repsMax: prescription.repsMax,
          durationSeconds: null,
          restSeconds: prescription.restSeconds,
          tempo: prescription.tempo,
          intensityGuidance: prescription.intensityGuidance,
          notes: null,
        });
        usedTodayIds.add(picked.id);
      }
    }

    const estimatedDurationMinutes = Math.round(
      WARMUP_MINUTES + exercises.reduce((sum, ex) => sum + estimateExerciseSeconds(ex), 0) / 60
    );

    days.push({
      dayOfWeek,
      name: template.name,
      isRestDay: false,
      focusMuscleGroups: template.focusMuscleGroups,
      estimatedDurationMinutes,
      exercises,
    });
  }

  return {
    name: `${GOAL_LABELS[input.primaryGoal as FitnessGoal] ?? "Personalised"} Programme`,
    splitType: input.splitType === "custom" ? (input.daysPerWeek <= 3 ? "full_body" : input.daysPerWeek === 4 ? "upper_lower" : "push_pull_legs") : input.splitType,
    daysPerWeek: input.daysPerWeek,
    primaryGoal: input.primaryGoal,
    days,
  };
}
