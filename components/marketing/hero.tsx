"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid-fade absolute inset-0 -z-10 h-[640px]" />

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-2 lg:gap-12 lg:pb-28 lg:pt-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <Sparkles className="size-3.5 text-primary" />
            Personalised training, powered by AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]"
          >
            Your workout. Your goals.
            <br />
            <span className="text-primary">Your AI coach.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground"
          >
            WorkoutMate builds a training programme around your body, schedule and equipment —
            then adapts it as you go, with an AI coach that actually knows your plan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button size="lg" asChild>
              <Link href="/login">
                Get Started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="mt-6 text-xs text-muted-foreground"
          >
            Free to start · No credit card required
          </motion.p>
        </div>

        <div className="lg:pl-6">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
