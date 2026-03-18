import { describe, it, expect, beforeEach } from "vitest";
import { useWizardStore } from "@/lib/wizard-store";
import type { Step1Data, Step2Data, Step3Data, Step4Data, Step5Data } from "@/lib/wizard-types";

// Minimal valid Step1Data
const makeStep1 = (overrides: Partial<Step1Data> = {}): Step1Data => ({
  game_type: "slot",
  variant: "video_slot",
  grid: { reels: 5, rows: 3 },
  win_mechanic: "fixed_paylines",
  paylines: 20,
  bet: { min: 0.2, max: 100, default: 1 },
  markets: ["mga"],
  market_constraints: {},
  ...overrides,
});

const makeStep2 = (overrides: Partial<Step2Data> = {}): Step2Data => ({
  target_rtp: 96,
  volatility: "med_high",
  hit_frequency: 28,
  max_win: 5000,
  bonus_frequency: 150,
  rtp_variants: [96, 94, 92],
  ...overrides,
});

const makeStep3 = (): Step3Data => ({
  features: [{ type: "wild", variant: "standard", config: {} }],
  complexity_score: 3,
  estimated_dev_weeks: 4,
});

const makeStep4 = (): Step4Data => ({
  sub_steps_complete: [true, true, true, true, true, true],
  brief: { theme_input: "Aztec", audience: ["eu mainstream"], mood: ["Epic"], references: [], creative_direction: "" },
  concepts: [],
  selected_concept: { source: "custom", name: "Tempest", usp: "Storm mechanic" },
  theme: { description: "Aztec storm", usp_detail: "Lightning wilds", bonus_narrative: "Temple bonus" },
  naming: { selected: "Tempest of Quetzalcoatl", alternatives: [], localization: {}, reasoning: {} },
  symbols: [{ id: "wild", name: "Wild", role: "wild" }],
  art_direction: {
    style: "3D realistic",
    palette: ["#FFD700", "#1E3A5F"],
    sound: { ambient: "wind", spin: "whoosh", win: "coins", bonus_trigger: "thunder", cascade: "crumble", max_win: "epic" },
  },
});

const makeStep5 = (): Step5Data => ({
  active_variant: "96.0",
  rtp_variants: {
    "96.0": {
      paytable: [{ symbol_id: "hp1", label: "Diamond", x3: 2, x4: 5, x5: 15 }],
      reel_strips: { reel1: { hp1: 10, lp1: 20 } },
      stops_per_reel: 30,
      analytical_rtp: 96.0,
    },
  },
  rtp_budget: { base_wins: 538, wild_substitution: 180, free_spins: 200, accumulator: 42 },
  target_rtp_tenths: 960,
});

describe("wizard-store", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  describe("initial state", () => {
    it("starts at step 1 with null data", () => {
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(1);
      expect(state.step1).toBeNull();
      expect(state.step2).toBeNull();
      expect(state.step3).toBeNull();
      expect(state.step4).toBeNull();
      expect(state.step5).toBeNull();
      expect(state.step6).toBeNull();
      expect(state.step7).toBeNull();
      expect(state.step8).toBeNull();
      expect(state.completedSteps).toEqual([]);
      expect(state.stepValidity).toEqual({});
    });
  });

  describe("step completion", () => {
    it("setStep1 stores data, marks completed, advances to step 2", () => {
      useWizardStore.getState().setStep1(makeStep1());
      const state = useWizardStore.getState();
      expect(state.step1).not.toBeNull();
      expect(state.step1!.game_type).toBe("slot");
      expect(state.currentStep).toBe(2);
      expect(state.completedSteps).toContain(1);
      expect(state.stepValidity[1]).toBe("valid");
    });

    it("setStep2 advances to step 3", () => {
      useWizardStore.getState().setStep2(makeStep2());
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(3);
      expect(state.completedSteps).toContain(2);
    });

    it("setStep3 advances to step 4", () => {
      useWizardStore.getState().setStep3(makeStep3());
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(4);
      expect(state.completedSteps).toContain(3);
    });

    it("setStep4 advances to step 5", () => {
      useWizardStore.getState().setStep4(makeStep4());
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(5);
      expect(state.completedSteps).toContain(4);
    });

    it("setStep5 advances to step 6", () => {
      useWizardStore.getState().setStep5(makeStep5());
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(6);
      expect(state.completedSteps).toContain(5);
    });

    it("does not duplicate completedSteps on repeat calls", () => {
      const { setStep1 } = useWizardStore.getState();
      setStep1(makeStep1());
      setStep1(makeStep1());
      const state = useWizardStore.getState();
      expect(state.completedSteps.filter((s) => s === 1)).toHaveLength(1);
    });
  });

  describe("cascade invalidation — PITFALLS.md dependency map", () => {
    it("grid changed → invalidates 5,6,7 (not 2,3,4)", () => {
      const { setStep1, setStep2, setStep3, setStep5 } = useWizardStore.getState();
      setStep1(makeStep1({ grid: { reels: 5, rows: 3 } }));
      setStep2(makeStep2());
      setStep3(makeStep3());
      useWizardStore.getState().setCurrentStep(5);
      setStep5(makeStep5());

      useWizardStore.getState().setStep1(makeStep1({ grid: { reels: 6, rows: 4 } }));
      const v = useWizardStore.getState().stepValidity;
      expect(v[1]).toBe("valid");
      expect(v[2]).toBe("valid"); // grid doesn't invalidate step 2
      expect(v[3]).toBe("valid"); // grid doesn't invalidate step 3
      expect(v[5]).toBe("stale"); // math
    });

    it("game_type changed → invalidates 2,3,4,5,6,7,8", () => {
      const { setStep1, setStep2 } = useWizardStore.getState();
      setStep1(makeStep1({ game_type: "slot" }));
      setStep2(makeStep2());
      expect(useWizardStore.getState().stepValidity[2]).toBe("valid");

      useWizardStore.getState().setStep1(makeStep1({ game_type: "crash" }));
      expect(useWizardStore.getState().stepValidity[2]).toBe("stale");
    });

    it("paylines changed → invalidates 5,6,7", () => {
      const { setStep1, setStep2, setStep5 } = useWizardStore.getState();
      setStep1(makeStep1({ paylines: 20 }));
      setStep2(makeStep2());
      useWizardStore.getState().setCurrentStep(5);
      setStep5(makeStep5());

      useWizardStore.getState().setStep1(makeStep1({ paylines: 25 }));
      const v = useWizardStore.getState().stepValidity;
      expect(v[2]).toBe("valid"); // paylines doesn't invalidate step 2
      expect(v[5]).toBe("stale");
    });

    it("markets changed → invalidates 3 and 8 only", () => {
      const { setStep1, setStep2, setStep3 } = useWizardStore.getState();
      setStep1(makeStep1({ markets: ["mga"] }));
      setStep2(makeStep2());
      setStep3(makeStep3());
      useWizardStore.setState((s) => ({
        stepValidity: { ...s.stepValidity, 8: "valid" },
      }));

      useWizardStore.getState().setStep1(makeStep1({ markets: ["mga", "ukgc"] }));
      const v = useWizardStore.getState().stepValidity;
      expect(v[2]).toBe("valid"); // markets doesn't invalidate step 2
      expect(v[3]).toBe("stale"); // feature restrictions
      expect(v[8]).toBe("stale"); // compliance section
    });

    it("bet_range changed → invalidates NOTHING", () => {
      const { setStep1, setStep2, setStep3 } = useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2());
      setStep3(makeStep3());

      useWizardStore.getState().setStep1(
        makeStep1({ bet: { min: 0.1, max: 200, default: 2 } })
      );
      const v = useWizardStore.getState().stepValidity;
      expect(v[2]).toBe("valid");
      expect(v[3]).toBe("valid");
    });

    it("step 2 RTP/volatility change → invalidates 5,6,7", () => {
      const { setStep1, setStep2, setStep5 } = useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2({ target_rtp: 96, volatility: "med_high" }));
      useWizardStore.getState().setCurrentStep(5);
      setStep5(makeStep5());

      useWizardStore.getState().setStep2(makeStep2({ target_rtp: 94, volatility: "high" }));
      const v = useWizardStore.getState().stepValidity;
      expect(v[5]).toBe("stale");
    });

    it("step 2 unchanged save → does NOT invalidate downstream", () => {
      const { setStep1, setStep2, setStep5 } = useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2());
      useWizardStore.getState().setCurrentStep(5);
      setStep5(makeStep5());

      // Re-save same step 2 data
      useWizardStore.getState().setStep2(makeStep2());
      expect(useWizardStore.getState().stepValidity[5]).toBe("valid");
    });

    it("step 3 feature changes → invalidates 5,6,7", () => {
      const { setStep1, setStep2, setStep3, setStep5 } = useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2());
      setStep3(makeStep3());
      useWizardStore.getState().setCurrentStep(5);
      setStep5(makeStep5());

      useWizardStore.getState().setStep3(makeStep3());
      expect(useWizardStore.getState().stepValidity[5]).toBe("stale");
    });

    it("step 4 symbol changes → invalidates 5,6,7", () => {
      const { setStep1, setStep2, setStep3, setStep4, setStep5 } =
        useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2());
      setStep3(makeStep3());
      setStep4(makeStep4());
      setStep5(makeStep5());

      const modified = makeStep4();
      modified.symbols = [...modified.symbols, { id: "hp1", name: "Dragon", role: "high_pay" }];
      useWizardStore.getState().setStep4(modified);
      expect(useWizardStore.getState().stepValidity[5]).toBe("stale");
    });

    it("step 4 theme-only change → invalidates 8 but not 5", () => {
      const { setStep1, setStep2, setStep3, setStep4, setStep5 } =
        useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2());
      setStep3(makeStep3());
      setStep4(makeStep4());
      setStep5(makeStep5());
      useWizardStore.setState((s) => ({
        stepValidity: { ...s.stepValidity, 8: "valid" },
      }));

      const modified = makeStep4();
      modified.naming = { selected: "New Name", alternatives: [], localization: {}, reasoning: {} };
      useWizardStore.getState().setStep4(modified);
      const v = useWizardStore.getState().stepValidity;
      expect(v[5]).toBe("valid"); // symbols unchanged, math stays valid
      expect(v[8]).toBe("stale"); // naming changed, GDD needs update
    });

    it("step 5 changes → invalidates 6,7,8", () => {
      const { setStep1, setStep2, setStep3, setStep4, setStep5 } =
        useWizardStore.getState();
      setStep1(makeStep1());
      setStep2(makeStep2());
      setStep3(makeStep3());
      setStep4(makeStep4());
      setStep5(makeStep5());

      useWizardStore.setState((s) => ({
        stepValidity: { ...s.stepValidity, 7: "valid" },
      }));

      useWizardStore.getState().setStep5(makeStep5());
      expect(useWizardStore.getState().stepValidity[7]).toBe("stale");
    });

    it("step 7 changes → invalidates 8", () => {
      useWizardStore.setState((s) => ({
        stepValidity: { ...s.stepValidity, 8: "valid" },
      }));

      useWizardStore.getState().setStep7({
        visual_mode: "emoji",
        ui_skin: "light",
        feature_toggles: {
          sound: true, win_animations: true, accumulator_ui: true,
          autoplay: true, paytable_visible: true, rtp_debug: false,
        },
        demo_balance: 1000,
        view_type: "stakeholder",
        speed: "normal",
      });

      expect(useWizardStore.getState().stepValidity[8]).toBe("stale");
    });
  });

  describe("navigation", () => {
    it("setCurrentStep changes current step without affecting data", () => {
      useWizardStore.getState().setStep1(makeStep1());
      useWizardStore.getState().setCurrentStep(5);
      const state = useWizardStore.getState();
      expect(state.currentStep).toBe(5);
      expect(state.step1).not.toBeNull(); // data preserved
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      useWizardStore.getState().setStep1(makeStep1());
      useWizardStore.getState().setStep2(makeStep2());
      useWizardStore.getState().reset();

      const state = useWizardStore.getState();
      expect(state.step1).toBeNull();
      expect(state.step2).toBeNull();
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([]);
      expect(state.stepValidity).toEqual({});
    });
  });

  describe("RTP budget arithmetic", () => {
    it("budget segments stored as integer tenths sum to target", () => {
      const step5 = makeStep5();
      const budget = step5.rtp_budget;
      const total = budget.base_wins + budget.wild_substitution + budget.free_spins + budget.accumulator;
      expect(total).toBe(step5.target_rtp_tenths);
    });

    it("individual segments are >= 10 (1.0% minimum)", () => {
      const budget = makeStep5().rtp_budget;
      expect(budget.base_wins).toBeGreaterThanOrEqual(10);
      expect(budget.wild_substitution).toBeGreaterThanOrEqual(10);
      expect(budget.free_spins).toBeGreaterThanOrEqual(10);
      expect(budget.accumulator).toBeGreaterThanOrEqual(10);
    });
  });
});
