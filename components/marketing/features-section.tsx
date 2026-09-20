"use client";

import { motion } from "framer-motion";
import { Dumbbell, LineChart, MessageCircleHeart, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Personalised Training",
    description:
      "Training generated around your goals, schedule and equipment — a real structured programme, not a random workout generator.",
  },
  {
    icon: MessageCircleHeart,
    title: "AI Coach",
    description:
      "Chat with your personal AI coach and adapt your plan whenever life changes — swap an exercise, shorten a session, ask why you're stuck.",
  },
  {
    icon: LineChart,
    title: "Track Progress",
    description:
      "Track workouts, strength, consistency and progress over time, with clean charts and personal records that update themselves.",
  },
  {
    icon: RefreshCw,
    title: "Built Around You",
    description:
      "Your plan evolves as your goals and performance change — every workout logged sharpens the next one.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a great coach gives you
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          WorkoutMate combines a real training system with an AI that understands your context —
          so every recommendation actually fits you.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <Card className="h-full p-7 transition-colors hover:border-primary/30">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
