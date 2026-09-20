import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ONBOARDING_DEFAULTS, ONBOARDING_STEPS, type OnboardingData } from "@/lib/validations/onboarding";

interface OnboardingState {
  data: OnboardingData;
  stepIndex: number;
  set: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  setMany: (patch: Partial<OnboardingData>) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      data: ONBOARDING_DEFAULTS,
      stepIndex: 0,
      set: (key, value) => set((state) => ({ data: { ...state.data, [key]: value } })),
      setMany: (patch) => set((state) => ({ data: { ...state.data, ...patch } })),
      goNext: () => {
        const next = Math.min(get().stepIndex + 1, ONBOARDING_STEPS.length - 1);
        set({ stepIndex: next });
      },
      goBack: () => {
        const prev = Math.max(get().stepIndex - 1, 0);
        set({ stepIndex: prev });
      },
      goToStep: (index) => set({ stepIndex: Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1)) }),
      reset: () => set({ data: ONBOARDING_DEFAULTS, stepIndex: 0 }),
    }),
    { name: "workoutmate-onboarding-draft" }
  )
);
