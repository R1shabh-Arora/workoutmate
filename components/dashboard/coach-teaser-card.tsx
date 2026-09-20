import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CoachTeaserCard({ firstName, hasWorkoutToday }: { firstName: string; hasWorkoutToday: boolean }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MessageCircle className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Hey {firstName || "there"} 👋 {hasWorkoutToday ? "Ready for today's workout?" : "How's training going?"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Ask about your plan, swap an exercise, or check your progress.</p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/coach">Talk to Coach</Link>
      </Button>
    </Card>
  );
}
