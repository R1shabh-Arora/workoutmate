"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkoutSessionStore } from "@/lib/stores/workout-session-store";
import { cn } from "@/lib/utils";

const PRESETS = [30, 60, 90, 120, 180];

export function RestTimer() {
  const { restEndsAt, restDurationSeconds, startRest, clearRest } = useWorkoutSessionStore();
  // Only ever read while restEndsAt is set (see the early return below), so
  // there's no need to reset it when the timer isn't running.
  const [remaining, setRemaining] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    try {
      const ctx = audioCtxRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio isn't critical — silently skip if the browser blocks it.
    }
  }, []);

  useEffect(() => {
    if (!restEndsAt) return;
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((restEndsAt - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft === 0) {
        playChime();
        clearRest();
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [restEndsAt, clearRest, playChime]);

  if (!restEndsAt) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Timer className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Rest:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => startRest(p)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40"
          >
            {p}s
          </button>
        ))}
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (remaining / restDurationSeconds) * 100));

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">Resting</span>
        <button type="button" onClick={clearRest} className="text-muted-foreground hover:text-foreground" aria-label="Skip rest">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => startRest(Math.max(5, remaining - 15))}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
          aria-label="Subtract 15 seconds"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-[5ch] text-center text-4xl font-semibold tabular-nums">{remaining}</span>
        <button
          type="button"
          onClick={() => startRest(remaining + 15)}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
          aria-label="Add 15 seconds"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
        <div className={cn("h-full bg-primary transition-[width] duration-300 ease-linear")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
