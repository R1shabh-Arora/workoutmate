"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 text-center sm:px-12"
      >
        <div className="bg-grid-fade pointer-events-none absolute inset-0" />
        <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to train smarter?
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-pretty text-lg text-muted-foreground">
          Set up your profile in a couple of minutes and get a plan built entirely around you.
        </p>
        <div className="relative mt-8 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/login">
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
