import { Dumbbell } from "lucide-react";

export function ExerciseIllustration({ name }: { name: string }) {
  return (
    <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
      <div className="bg-grid-fade absolute inset-0 opacity-40" />
      <Dumbbell className="relative size-10 text-primary/50" strokeWidth={1.5} />
      <span className="sr-only">{name}</span>
    </div>
  );
}
