import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Step1Data, Step2Data, Step3Data, Step4Data, Step5Data, Step6Data, Step7Data, Step8Data, Step9Data, StepValidity } from "./wizard-types";

/**
 * Mark specific downstream steps as stale (only if currently valid).
 * Per PITFALLS.md #4 — never auto-delete data, just mark stale.
 */
function markStale(validity: Record<number, StepValidity>, steps: number[]): void {
  for (const s of steps) {
    if (validity[s] === "valid") validity[s] = "stale";
  }
}

interface WizardStore {
  // Data per step
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4: Step4Data | null;
  step5: Step5Data | null;
  step6: Step6Data | null;
  step7: Step7Data | null;
  step8: Step8Data | null;
  step9: Step9Data | null;

  // Navigation
  currentStep: number;
  completedSteps: number[];

  // Validity tracking — per PITFALLS.md cascade invalidation
  stepValidity: Record<number, StepValidity>;

  // Actions
  setStep1: (data: Step1Data) => void;
  setStep2: (data: Step2Data) => void;
  setStep3: (data: Step3Data) => void;
  setStep4: (data: Step4Data) => void;
  setStep5: (data: Step5Data) => void;
  setStep6: (data: Step6Data) => void;
  setStep7: (data: Step7Data) => void;
  setStep8: (data: Step8Data) => void;
  setStep9: (data: Step9Data) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      step1: null,
      step2: null,
      step3: null,
      step4: null,
      step5: null,
      step6: null,
      step7: null,
      step8: null,
      step9: null,
      currentStep: 1,
      completedSteps: [],
      stepValidity: {},

      setStep1: (data) => {
        const prev = get().step1;

        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 1: "valid" };

          if (prev) {
            // Per PITFALLS.md #4 — field-level dependency map:
            // game_type → invalidates 2,3,4,5,6,7,8,9
            if (prev.game_type !== data.game_type) {
              markStale(validity, [2, 3, 4, 5, 6, 7, 8, 9]);
            }
            // grid → invalidates 5,6,7,8 (step 8 uses ${reels}, ${rows}, ${paylines})
            if (prev.grid?.reels !== data.grid?.reels || prev.grid?.rows !== data.grid?.rows) {
              markStale(validity, [5, 6, 7, 8]);
            }
            // paylines → invalidates 5,6,7,8
            if (prev.paylines !== data.paylines) {
              markStale(validity, [5, 6, 7, 8]);
            }
            // markets → invalidates 3 (feature restrictions), 8 (rules compliance), 9 (GDD compliance)
            if (JSON.stringify(prev.markets) !== JSON.stringify(data.markets)) {
              markStale(validity, [3, 8, 9]);
            }
            // bet_range → invalidates 8 (step 8 uses ${minBet}, ${maxBet})
            if (prev.bet?.min !== data.bet?.min || prev.bet?.max !== data.bet?.max) {
              markStale(validity, [8]);
            }
          }

          return {
            step1: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(1)
              ? state.completedSteps
              : [...state.completedSteps, 1],
            currentStep: 2,
          };
        });
      },

      setStep2: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 2: "valid" };
          const prev = state.step2;
          if (prev) {
            // volatility/target_rtp/hit_frequency/max_win/bonus_frequency → invalidates 5,6,7,8
            const mathChanged =
              prev.target_rtp !== data.target_rtp ||
              prev.volatility !== data.volatility ||
              prev.hit_frequency !== data.hit_frequency ||
              prev.max_win !== data.max_win ||
              prev.bonus_frequency !== data.bonus_frequency;
            if (mathChanged) {
              markStale(validity, [5, 6, 7, 8]);
            }
            // rtp_variants list changed → invalidates 5
            if (JSON.stringify(prev.rtp_variants) !== JSON.stringify(data.rtp_variants)) {
              markStale(validity, [5]);
            }
          }
          return {
            step2: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(2)
              ? state.completedSteps
              : [...state.completedSteps, 2],
            currentStep: 3,
          };
        });
      },

      setStep3: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 3: "valid" };
          // Feature changes invalidate downstream math/simulation/prototype/rules/export
          for (let i = 5; i <= 9; i++) {
            if (validity[i] === "valid") validity[i] = "stale";
          }
          return {
            step3: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(3)
              ? state.completedSteps
              : [...state.completedSteps, 3],
            currentStep: 4,
          };
        });
      },

      setStep4: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 4: "valid" };
          const prev = state.step4;
          if (prev) {
            // symbols changed → invalidates 5,6,7 (math model uses symbol IDs)
            if (JSON.stringify(prev.symbols) !== JSON.stringify(data.symbols)) {
              markStale(validity, [5, 6, 7]);
            }
            // theme/art/naming/concept → invalidates 8 (rules %Gamename), 9 (GDD content)
            const themeChanged =
              JSON.stringify(prev.theme) !== JSON.stringify(data.theme) ||
              JSON.stringify(prev.art_direction) !== JSON.stringify(data.art_direction) ||
              JSON.stringify(prev.selected_concept) !== JSON.stringify(data.selected_concept) ||
              prev.naming?.selected !== data.naming?.selected;
            if (themeChanged) {
              markStale(validity, [8, 9]);
            }
          }
          return {
            step4: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(4)
              ? state.completedSteps
              : [...state.completedSteps, 4],
            currentStep: 5,
          };
        });
      },

      setStep5: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 5: "valid" };
          // Math model changes invalidate downstream simulation/prototype/rules/export
          for (let i = 6; i <= 9; i++) {
            if (validity[i] === "valid") validity[i] = "stale";
          }
          return {
            step5: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(5)
              ? state.completedSteps
              : [...state.completedSteps, 5],
            currentStep: 6,
          };
        });
      },

      setStep6: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 6: "valid" };
          // Simulation results invalidate prototype/rules/export
          for (let i = 7; i <= 9; i++) {
            if (validity[i] === "valid") validity[i] = "stale";
          }
          return {
            step6: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(6)
              ? state.completedSteps
              : [...state.completedSteps, 6],
            currentStep: 7,
          };
        });
      },

      setStep7: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 7: "valid" };
          // Prototype changes invalidate rules/export
          markStale(validity, [8, 9]);
          return {
            step7: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(7)
              ? state.completedSteps
              : [...state.completedSteps, 7],
            currentStep: 8,
          };
        });
      },

      setStep8: (data) => {
        set((state) => {
          const validity: Record<number, StepValidity> = { ...state.stepValidity, 8: "valid" };
          // Rules changes invalidate export (GDD references rules)
          markStale(validity, [9]);
          return {
            step8: data,
            stepValidity: validity,
            completedSteps: state.completedSteps.includes(8)
              ? state.completedSteps
              : [...state.completedSteps, 8],
            currentStep: 9,
          };
        });
      },

      setStep9: (data) => {
        set((state) => ({
          step9: data,
          stepValidity: { ...state.stepValidity, 9: "valid" },
          completedSteps: state.completedSteps.includes(9)
            ? state.completedSteps
            : [...state.completedSteps, 9],
        }));
      },

      setCurrentStep: (step) => set({ currentStep: step }),

      reset: () =>
        set({
          step1: null,
          step2: null,
          step3: null,
          step4: null,
          step5: null,
          step6: null,
          step7: null,
          step8: null,
          step9: null,
          currentStep: 1,
          completedSteps: [],
          stepValidity: {},
        }),
    }),
    {
      name: "slotcraft-wizard",
    }
  )
);
