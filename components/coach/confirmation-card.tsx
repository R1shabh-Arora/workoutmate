"use client";

import { useState } from "react";
import { Check, X, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyPendingChange, cancelPendingChange } from "@/lib/actions/coach";

type CardStatus = "pending" | "applying" | "applied" | "cancelled" | "expired";

export function ConfirmationCard({
  pendingChangeId,
  summary,
  initialStatus = "pending",
}: {
  pendingChangeId: string;
  summary: string;
  initialStatus?: Exclude<CardStatus, "applying">;
}) {
  const [status, setStatus] = useState<CardStatus>(initialStatus);

  async function handleApply() {
    setStatus("applying");
    try {
      await applyPendingChange(pendingChangeId);
      setStatus("applied");
      toast.success("Plan updated");
    } catch (err) {
      setStatus("pending");
      toast.error(err instanceof Error ? err.message : "Couldn't apply that change.");
    }
  }

  async function handleCancel() {
    setStatus("cancelled");
    await cancelPendingChange(pendingChangeId).catch(() => {});
  }

  if (status === "applied") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-success/30 bg-success/[0.06] px-4 py-3 text-sm text-success">
        <Check className="size-4 shrink-0" />
        Applied — your plan has been updated.
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <X className="size-4 shrink-0" />
        Cancelled — no changes made.
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" />
        This proposal expired — ask again if you&apos;d still like this change.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <div className="flex gap-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm">{summary}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleApply} disabled={status === "applying"}>
          {status === "applying" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Apply Change
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={status === "applying"}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
