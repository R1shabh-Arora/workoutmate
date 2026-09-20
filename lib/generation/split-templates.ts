import type { DayTemplate } from "./types";
import type { SplitType } from "@/lib/types/enums";

const FULL_BODY: DayTemplate = {
  name: "Full Body",
  focusMuscleGroups: ["chest", "lats", "quads", "shoulders", "abs"],
  slots: [
    { muscles: ["quads", "hamstrings", "glutes"], movementType: "compound", priority: "primary" },
    { muscles: ["chest"], movementType: "compound", priority: "primary" },
    { muscles: ["lats", "upper_back"], movementType: "compound", priority: "primary" },
    { muscles: ["shoulders"], movementType: "compound", priority: "secondary" },
    { muscles: ["hamstrings", "glutes"], movementType: "compound", priority: "secondary" },
    { muscles: ["biceps", "triceps"], movementType: "isolation", priority: "secondary" },
    { muscles: ["abs", "obliques"], movementType: "isolation", priority: "finisher" },
  ],
};

const UPPER: DayTemplate = {
  name: "Upper Body",
  focusMuscleGroups: ["chest", "lats", "shoulders", "biceps", "triceps"],
  slots: [
    { muscles: ["chest"], movementType: "compound", priority: "primary" },
    { muscles: ["lats", "upper_back"], movementType: "compound", priority: "primary" },
    { muscles: ["shoulders"], movementType: "compound", priority: "secondary" },
    { muscles: ["upper_back"], movementType: "compound", priority: "secondary" },
    { muscles: ["biceps"], movementType: "isolation", priority: "secondary" },
    { muscles: ["triceps"], movementType: "isolation", priority: "secondary" },
    { muscles: ["shoulders"], movementType: "isolation", priority: "finisher" },
  ],
};

const LOWER: DayTemplate = {
  name: "Lower Body",
  focusMuscleGroups: ["quads", "hamstrings", "glutes", "calves", "abs"],
  slots: [
    { muscles: ["quads"], movementType: "compound", priority: "primary" },
    { muscles: ["hamstrings", "glutes"], movementType: "compound", priority: "primary" },
    { muscles: ["glutes"], movementType: "compound", priority: "secondary" },
    { muscles: ["quads"], movementType: "isolation", priority: "secondary" },
    { muscles: ["hamstrings"], movementType: "isolation", priority: "secondary" },
    { muscles: ["calves"], movementType: "isolation", priority: "finisher" },
    { muscles: ["abs", "obliques"], movementType: "isolation", priority: "finisher" },
  ],
};

const PUSH: DayTemplate = {
  name: "Push",
  focusMuscleGroups: ["chest", "shoulders", "triceps"],
  slots: [
    { muscles: ["chest"], movementType: "compound", priority: "primary" },
    { muscles: ["shoulders"], movementType: "compound", priority: "primary" },
    { muscles: ["chest"], movementType: "isolation", priority: "secondary" },
    { muscles: ["shoulders"], movementType: "isolation", priority: "secondary" },
    { muscles: ["triceps"], movementType: "isolation", priority: "secondary" },
    { muscles: ["triceps"], movementType: "isolation", priority: "finisher" },
  ],
};

const PULL: DayTemplate = {
  name: "Pull",
  focusMuscleGroups: ["lats", "biceps", "forearms"],
  slots: [
    { muscles: ["lats"], movementType: "compound", priority: "primary" },
    { muscles: ["upper_back"], movementType: "compound", priority: "primary" },
    { muscles: ["lats", "upper_back"], movementType: "compound", priority: "secondary" },
    { muscles: ["shoulders"], movementType: "isolation", priority: "secondary" },
    { muscles: ["biceps"], movementType: "isolation", priority: "secondary" },
    { muscles: ["biceps", "forearms"], movementType: "isolation", priority: "finisher" },
  ],
};

const LEGS: DayTemplate = {
  name: "Legs",
  focusMuscleGroups: ["quads", "hamstrings", "glutes", "calves"],
  slots: [
    { muscles: ["quads"], movementType: "compound", priority: "primary" },
    { muscles: ["hamstrings", "glutes"], movementType: "compound", priority: "primary" },
    { muscles: ["glutes"], movementType: "compound", priority: "secondary" },
    { muscles: ["quads"], movementType: "isolation", priority: "secondary" },
    { muscles: ["hamstrings"], movementType: "isolation", priority: "secondary" },
    { muscles: ["calves"], movementType: "isolation", priority: "finisher" },
  ],
};

const CARDIO_CORE: DayTemplate = {
  name: "Cardio & Core",
  focusMuscleGroups: ["cardio", "abs"],
  slots: [
    { muscles: ["cardio"], movementType: "cardio", priority: "primary" },
    { muscles: ["abs", "obliques"], movementType: "isolation", priority: "secondary" },
    { muscles: ["abs", "obliques"], movementType: "isolation", priority: "finisher" },
  ],
};

/**
 * Resolves a week's worth of day templates in order. This is the core split
 * logic: it decides what kind of day each training slot is, independent of
 * which calendar weekday it eventually lands on.
 */
export function resolveDayTemplates(splitType: SplitType, daysPerWeek: number): DayTemplate[] {
  const effectiveSplit = splitType === "custom" ? autoSplitFor(daysPerWeek) : splitType;

  switch (effectiveSplit) {
    case "full_body":
      return Array.from({ length: daysPerWeek }, () => FULL_BODY);

    case "upper_lower": {
      const pattern = [UPPER, LOWER];
      return Array.from({ length: daysPerWeek }, (_, i) => pattern[i % 2]!);
    }

    case "push_pull_legs": {
      const pattern = [PUSH, PULL, LEGS];
      return Array.from({ length: daysPerWeek }, (_, i) => pattern[i % 3]!);
    }

    default:
      return Array.from({ length: daysPerWeek }, () => FULL_BODY);
  }
}

function autoSplitFor(daysPerWeek: number): Exclude<SplitType, "custom"> {
  if (daysPerWeek <= 3) return "full_body";
  if (daysPerWeek === 4) return "upper_lower";
  return "push_pull_legs";
}

export { CARDIO_CORE };
