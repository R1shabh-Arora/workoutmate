"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Sun, Moon, Monitor } from "lucide-react";
import { SettingsSection } from "./settings-section";
import { SelectableCard } from "@/components/onboarding/selectable-card";
import { updateAiCoachTone } from "@/lib/actions/settings";
import { AI_COACH_TONES } from "@/lib/types/enums";
import type { AiCoachTone } from "@/lib/types/enums";

const TONE_LABELS: Record<AiCoachTone, { title: string; description: string }> = {
  balanced: { title: "Balanced", description: "A mix of encouragement and direct feedback." },
  encouraging: { title: "Encouraging", description: "More positive reinforcement." },
  direct: { title: "Direct", description: "Brief and to the point." },
};

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AiAppearanceSection({ initialTone }: { initialTone: AiCoachTone }) {
  const [tone, setTone] = useState(initialTone);
  const [, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  function handleToneChange(next: AiCoachTone) {
    setTone(next);
    startTransition(async () => {
      try {
        await updateAiCoachTone(next);
      } catch {
        toast.error("Couldn't save that preference.");
      }
    });
  }

  return (
    <SettingsSection title="AI Coach & appearance">
      <div className="space-y-2">
        <p className="text-sm font-medium">Coach tone</p>
        <div className="grid grid-cols-3 gap-2">
          {AI_COACH_TONES.map((t) => (
            <SelectableCard
              key={t}
              compact
              selected={tone === t}
              onClick={() => handleToneChange(t)}
              title={TONE_LABELS[t].title}
              description={TONE_LABELS[t].description}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              compact
              selected={theme === opt.value}
              onClick={() => setTheme(opt.value)}
              title={opt.label}
              icon={<opt.icon className="size-4" />}
            />
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
