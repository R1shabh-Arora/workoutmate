"use client";

import { motion } from "framer-motion";
import { Flame, MessageCircle, Play, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EXERCISES = [
  { name: "Bench Press", meta: "3 × 8–10 · 90s rest" },
  { name: "Lat Pulldown", meta: "3 × 8–12 · 75s rest" },
  { name: "Incline DB Press", meta: "3 × 10–12 · 60s rest" },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.03] dark:shadow-black/20"
      >
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="font-medium">
            Today · Push Day
          </Badge>
          <span className="text-xs text-muted-foreground">48 min · 6 exercises</span>
        </div>

        <h3 className="mt-3 text-xl font-semibold tracking-tight">Upper Body Strength</h3>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {["Chest", "Shoulders", "Triceps"].map((m) => (
            <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {m}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-col divide-y divide-border rounded-xl border border-border">
          {EXERCISES.map((ex, i) => (
            <motion.div
              key={ex.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              className="flex items-center justify-between px-3.5 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </div>
                <span className="text-sm font-medium">{ex.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{ex.meta}</span>
            </motion.div>
          ))}
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          <Play className="size-4 fill-current" />
          Start Workout
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16, x: -8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -left-6 -top-6 hidden w-44 rounded-xl border border-border bg-card p-3.5 shadow-lg shadow-black/[0.04] dark:shadow-black/20 sm:block lg:-left-10"
      >
        <div className="flex items-center gap-2 text-warning">
          <Flame className="size-4 fill-current" />
          <span className="text-xs font-semibold text-foreground">12-day streak</span>
        </div>
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
          Your longest yet. Keep it rolling.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -16, x: 8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -bottom-8 -right-4 w-56 rounded-xl border border-border bg-card p-3.5 shadow-lg shadow-black/[0.04] dark:shadow-black/20 sm:-right-8"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-3.5" />
          </div>
          <span className="text-xs font-semibold">Coach</span>
        </div>
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
          &ldquo;Squat volume is up 18% this month — nice work.&rdquo;
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute -bottom-5 left-6 hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-md lg:flex"
      >
        <TrendingUp className="size-3.5 text-success" />
        +18%
      </motion.div>
    </div>
  );
}
