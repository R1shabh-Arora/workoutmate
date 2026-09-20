"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LogOut, Trash2 } from "lucide-react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { signOutAction, deleteAccountAction } from "@/lib/actions/auth";

export function DangerZoneSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, startTransition] = useTransition();
  const [isSigningOut, startSignOutTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAccountAction();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete your account.");
      }
    });
  }

  return (
    <>
      <SettingsSection title="Account">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">Sign out of WorkoutMate on this device.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => startSignOutTransition(() => signOutAction())} disabled={isSigningOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently deletes your profile, plan, history and progress. This cannot be undone.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </SettingsSection>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, training plan, workout history and progress. There is no way to undo this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">delete</span> to confirm.
            </p>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={confirmText.toLowerCase() !== "delete" || isDeleting} onClick={handleDelete}>
              {isDeleting ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
