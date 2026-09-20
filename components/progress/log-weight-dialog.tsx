"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logBodyWeight } from "@/lib/actions/progress";
import { kgToLb, lbToKg } from "@/lib/utils";

export function LogWeightDialog({ unit }: { unit: "kg" | "lb" }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = Number(value);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid weight.");
      return;
    }
    const weightKg = unit === "lb" ? lbToKg(parsed) : parsed;

    startTransition(async () => {
      try {
        await logBodyWeight({ weightKg, measuredAt: new Date().toISOString().split("T")[0]! });
        toast.success("Weight logged");
        setOpen(false);
        setValue("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save that entry.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          Log weight
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log today&apos;s weight</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight ({unit})</Label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-12 text-center text-lg"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
