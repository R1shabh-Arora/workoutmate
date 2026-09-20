import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutLoading() {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col px-4 pt-4">
      <div className="flex items-center justify-between py-2">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="mt-5 aspect-[16/9] w-full rounded-xl" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-5 space-y-2.5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
