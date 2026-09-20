import { Bot, Loader2, Search, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationCard } from "./confirmation-card";
import type { UIMessage } from "ai";

const PROPOSE_TOOLS = new Set([
  "replace_exercise",
  "update_workout",
  "move_workout",
  "adjust_workout_duration",
  "change_training_days",
  "rebuild_plan",
]);

const TOOL_LABELS: Record<string, string> = {
  get_user_profile: "Checked your profile",
  get_current_plan: "Reviewed your plan",
  get_today_workout: "Checked today's workout",
  get_workout_history: "Reviewed your workout history",
  get_exercise_history: "Looked up exercise history",
  get_progress: "Reviewed your progress",
  recommend_progression: "Calculated a progression suggestion",
  log_workout: "Logged your workout",
};

function ToolPart({ part }: { part: Extract<UIMessage["parts"][number], { type: `tool-${string}` }> }) {
  const toolName = part.type.replace(/^tool-/, "");
  const isProposal = PROPOSE_TOOLS.has(toolName);

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {isProposal ? "Preparing a plan change…" : "Checking your data…"}
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
        <TriangleAlert className="size-3" />
        Something went wrong running that.
      </div>
    );
  }

  if (part.state === "output-available") {
    const output = part.output as Record<string, unknown> | undefined;

    if (isProposal && output?.proposed === true) {
      return <ConfirmationCard pendingChangeId={output.pendingChangeId as string} summary={output.summary as string} />;
    }
    if (isProposal && output?.proposed === false) {
      return (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="size-3" />
          {(output.reason as string) ?? "Couldn't prepare that change."}
        </div>
      );
    }
    if (!isProposal && toolName !== "log_workout") {
      return (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Search className="size-3" />
          {TOOL_LABELS[toolName] ?? "Checked your data"}
        </div>
      );
    }
  }

  return null;
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-3.5" />
        </div>
      )}
      <div className={cn("min-w-0 max-w-[85%] sm:max-w-[75%]", isUser && "flex flex-col items-end")}>
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {part.text}
              </div>
            );
          }
          if (part.type.startsWith("tool-")) {
            return <ToolPart key={i} part={part as Extract<UIMessage["parts"][number], { type: `tool-${string}` }>} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
