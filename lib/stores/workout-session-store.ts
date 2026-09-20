import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SetEntry {
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  rpe: number | null;
  notes: string;
  completed: boolean;
}

interface WorkoutSessionState {
  sessionId: string | null;
  currentExerciseIndex: number;
  /** Keyed by workout_exercise_id → one entry per set. */
  setEntries: Record<string, SetEntry[]>;
  /** Absolute epoch ms the current rest period ends — survives a refresh, unlike a countdown that resets on remount. */
  restEndsAt: number | null;
  restDurationSeconds: number;
  startedAt: number | null;

  initSession: (sessionId: string, exercises: { workoutExerciseId: string; sets: number }[]) => void;
  setCurrentExercise: (index: number) => void;
  updateSetEntry: (workoutExerciseId: string, setIndex: number, patch: Partial<SetEntry>) => void;
  startRest: (seconds: number) => void;
  clearRest: () => void;
  endSession: () => void;
}

const emptyEntry = (): SetEntry => ({
  reps: null,
  weightKg: null,
  durationSeconds: null,
  rpe: null,
  notes: "",
  completed: false,
});

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      currentExerciseIndex: 0,
      setEntries: {},
      restEndsAt: null,
      restDurationSeconds: 90,
      startedAt: null,

      initSession: (sessionId, exercises) => {
        // Only reset local progress if this is a *different* session than
        // what's stored — otherwise a page refresh would wipe your sets.
        if (get().sessionId === sessionId) return;
        const setEntries: Record<string, SetEntry[]> = {};
        for (const ex of exercises) {
          setEntries[ex.workoutExerciseId] = Array.from({ length: ex.sets }, emptyEntry);
        }
        set({ sessionId, currentExerciseIndex: 0, setEntries, restEndsAt: null, startedAt: Date.now() });
      },

      setCurrentExercise: (index) => set({ currentExerciseIndex: index }),

      updateSetEntry: (workoutExerciseId, setIndex, patch) =>
        set((state) => {
          const entries = state.setEntries[workoutExerciseId] ?? [];
          const next = [...entries];
          const current = next[setIndex] ?? emptyEntry();
          next[setIndex] = { ...current, ...patch };
          return { setEntries: { ...state.setEntries, [workoutExerciseId]: next } };
        }),

      startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000, restDurationSeconds: seconds }),
      clearRest: () => set({ restEndsAt: null }),

      endSession: () => set({ sessionId: null, currentExerciseIndex: 0, setEntries: {}, restEndsAt: null, startedAt: null }),
    }),
    { name: "workoutmate-active-workout" }
  )
);
