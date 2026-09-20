import type { Metadata } from "next";
import { searchExerciseLibrary } from "@/lib/data/exercises";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage() {
  const initial = await searchExerciseLibrary({}, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Exercise Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">{initial.total} exercises used to build your programme.</p>
      </div>
      <ExerciseLibrary initial={initial} />
    </div>
  );
}
