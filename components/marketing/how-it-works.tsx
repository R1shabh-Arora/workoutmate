"use client";

import { motion } from "framer-motion";
import { ClipboardList, LineChart, MessagesSquare, RefreshCcw, Sparkles, Dumbbell } from "lucide-react";

const STEPS = [
  { icon: ClipboardList, title: "Create your profile", description: "Tell us your goals, schedule and equipment in a guided, two-minute setup." },
  { icon: Sparkles, title: "Get your personalised plan", description: "WorkoutMate builds a structured programme around exactly what you told us." },
  { icon: Dumbbell, title: "Train", description: "Follow a clean, distraction-free workout screen with built-in rest timers." },
  { icon: LineChart, title: "Track progress", description: "Every set you log feeds your strength charts, volume trends and PRs." },
  { icon: MessagesSquare, title: "Talk to your AI coach", description: "Ask questions, request changes, or get a quick read on how training's going." },
  { icon: RefreshCcw, title: "Adapt and improve", description: "Your plan updates as your life and performance do — never a static PDF." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            From sign-up to your next PR, in six steps.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="relative flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
                  <step.icon className="size-5" />
                </div>
              </div>
              <div className="pb-2">
                <div className="mb-1 text-xs font-semibold text-primary">Step {i + 1}</div>
                <h3 className="text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
