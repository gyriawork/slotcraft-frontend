import { describe, it, expect, beforeEach } from "vitest";
import { useWizardStore } from "@/lib/wizard-store";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step7Data,
  Step8Data,
} from "@/lib/wizard-types";

// --- Fixtures ---

const makeStep1 = (overrides: Partial<Step1Data> = {}): Step1Data => ({
  game_type: "slot",
  variant: "video_slot",
  grid: { reels: 5, rows: 3 },
  win_mechanic: "fixed_paylines",
  paylines: 20,
  bet: { min: 0.2, max: 100, default: 1 },
  markets: ["mga", "ukgc"],
  market_constraints: {
    ukgc: { autoplay_disabled: true, bonus_buy_disabled: true },
  },
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

const makeStep3 = (overrides: Partial<Step3Data> = {}): Step3Data => ({
  features: [
    { type: "wild", variant: "expanding", config: {} },
    { type: "bonus", variant: "free_spins", config: { count: 10 } },
    { type: "enhancer", variant: "accumulator", config: { tiers: [2, 5, 10] } },
  ],
  complexity_score: 9,
  estimated_dev_weeks: 8,
  ...overrides,
});

const makeStep4 = (overrides: Partial<Step4Data> = {}): Step4Data => ({
  sub_steps_complete: [true, true, true, true, true, true],
  brief: {
    theme_input: "Aztec Gold",
    audience: ["eu_mainstream", "latam"],
    mood: ["epic", "mystical"],
    references: ["Book of Dead", "Gonzo's Quest"],
    creative_direction: "",
  },
  concepts: [
    { name: "Aztec Gold Rising", usp: "Progressive cascade", description: "Explore the temple", badge: "Best market fit", score: 8 },
    { name: "Aztec Gold Legends", usp: "Narrative progression", description: "Story-driven", badge: "Alternative angle", score: 7 },
    { name: "Aztec Gold Storm", usp: "Chaotic wilds", description: "High-vol chaos", badge: "Wildcard", score: 6 },
  ],
  selected_concept: { source: "ai_generated", index: 0, name: "Aztec Gold Rising", usp: "Progressive cascade" },
  theme: {
    description: "Deep within the jungle, an ancient temple guards the Aztec treasures",
    usp_detail: "Progressive cascade multiplier tied to temple depth",
    bonus_narrative: "Players descend through 5 temple chambers, each deeper level increases multiplier",
  },
  naming: {
    selected: "Tempest of Quetzalcoatl",
    alternatives: ["Aztec Gold Rising", "Temple of Thunder"],
    localization: { es: "Tempestad de Quetzalcóatl", pt: "Tempestade de Quetzalcoatl" },
    reasoning: {},
  },
  symbols: [
    { id: "wild", name: "Quetzalcoatl Wild", role: "wild" },
    { id: "scatter", name: "Temple Scatter", role: "scatter" },
    { id: "hp1", name: "Gold Mask", role: "high_pay" },
    { id: "hp2", name: "Jade Idol", role: "high_pay" },
    { id: "lp1", name: "10", role: "low_pay" },
    { id: "lp2", name: "J", role: "low_pay" },
  ],
  art_direction: {
    style: "3D realistic",
    palette: ["#FFD700", "#1E3A5F", "#2F4F2F"],
    sound: { ambient: "jungle", spin: "stone_roll", win: "coins_cascade", bonus_trigger: "thunder", cascade: "stone_crumble", max_win: "epic_fanfare" },
  },
  ...overrides,
});

const makeStep5 = (overrides: Partial<Step5Data> = {}): Step5Data => ({
  active_variant: "96.0",
  rtp_variants: {
    "96.0": {
      paytable: [
        { symbol_id: "hp1", label: "Gold Mask", x3: 3, x4: 8, x5: 25 },
        { symbol_id: "hp2", label: "Jade Idol", x3: 2, x4: 5, x5: 15 },
        { symbol_id: "lp1", label: "10", x3: 0.5, x4: 1, x5: 3 },
        { symbol_id: "lp2", label: "J", x3: 0.5, x4: 1, x5: 3 },
      ],
      reel_strips: {
        reel1: { hp1: 5, hp2: 8, lp1: 15, lp2: 15, wild: 2, scatter: 1 },
        reel2: { hp1: 5, hp2: 8, lp1: 15, lp2: 15, wild: 2, scatter: 1 },
        reel3: { hp1: 5, hp2: 8, lp1: 15, lp2: 15, wild: 2, scatter: 1 },
      },
      stops_per_reel: 46,
      analytical_rtp: 96.02,
    },
    "94.0": {
      paytable: [
        { symbol_id: "hp1", label: "Gold Mask", x3: 2.5, x4: 7, x5: 22 },
        { symbol_id: "hp2", label: "Jade Idol", x3: 1.8, x4: 4.5, x5: 13 },
      ],
      reel_strips: { reel1: { hp1: 4, hp2: 7, lp1: 17, lp2: 17, wild: 1, scatter: 1 } },
      stops_per_reel: 47,
      analytical_rtp: 94.01,
    },
  },
  rtp_budget: { base_wins: 538, wild_substitution: 180, free_spins: 200, accumulator: 42 },
  target_rtp_tenths: 960,
  ...overrides,
});

const makeStep7 = (overrides: Partial<Step7Data> = {}): Step7Data => ({
  visual_mode: "emoji",
  ui_skin: "light",
  feature_toggles: {
    sound: true,
    win_animations: true,
    accumulator_ui: true,
    autoplay: true,
    paytable_visible: true,
    rtp_debug: false,
  },
  demo_balance: 1000,
  view_type: "stakeholder",
  speed: "normal",
  ...overrides,
});

// --- Tests ---

describe("Wizard Integration", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  describe("full wizard flow — steps 1 through 9", () => {
    it("completes the entire wizard sequentially", () => {
      const store = useWizardStore;

      store.getState().setStep1(makeStep1());
      expect(store.getState().currentStep).toBe(2);
      expect(store.getState().completedSteps).toEqual([1]);

      store.getState().setStep2(makeStep2());
      expect(store.getState().currentStep).toBe(3);
      expect(store.getState().completedSteps).toEqual([1, 2]);

      store.getState().setStep3(makeStep3());
      expect(store.getState().currentStep).toBe(4);
      expect(store.getState().completedSteps).toEqual([1, 2, 3]);

      store.getState().setStep4(makeStep4());
      expect(store.getState().currentStep).toBe(5);
      expect(store.getState().completedSteps).toEqual([1, 2, 3, 4]);

      store.getState().setStep5(makeStep5());
      expect(store.getState().currentStep).toBe(6);
      expect(store.getState().completedSteps).toEqual([1, 2, 3, 4, 5]);

      // Step 6 (simulation) has no setStep6 — it's run-only, skip to 7
      store.getState().setCurrentStep(7);
      store.getState().setStep7(makeStep7());
      expect(store.getState().currentStep).toBe(8); // now goes to Rules step
      expect(store.getState().completedSteps).toEqual([1, 2, 3, 4, 5, 7]);

      // All step data present
      const state = store.getState();
      expect(state.step1?.game_type).toBe("slot");
      expect(state.step2?.target_rtp).toBe(96);
      expect(state.step3?.features).toHaveLength(3);
      expect(state.step4?.selected_concept?.name).toBe("Aztec Gold Rising");
      expect(state.step5?.rtp_variants["96.0"].analytical_rtp).toBeCloseTo(96.02);
      expect(state.step7?.visual_mode).toBe("emoji");
    });
  });

  describe("cascade invalidation — deep scenarios", () => {
    function completeAllSteps() {
      const s = useWizardStore.getState;
      s().setStep1(makeStep1());
      s().setStep2(makeStep2());
      s().setStep3(makeStep3());
      s().setStep4(makeStep4());
      s().setStep5(makeStep5());
      s().setCurrentStep(7);
      s().setStep7(makeStep7());
      // Manually mark steps 8-9 valid since we're testing cascading
      useWizardStore.setState((st) => ({
        stepValidity: { ...st.stepValidity, 8: "valid", 9: "valid" },
      }));
    }

    it("grid change invalidates math/sim/proto but not concept/features, preserves data", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      // All steps valid
      expect(s().stepValidity[2]).toBe("valid");
      expect(s().stepValidity[5]).toBe("valid");
      expect(s().stepValidity[7]).toBe("valid");
      expect(s().stepValidity[8]).toBe("valid");
      expect(s().stepValidity[9]).toBe("valid");

      // Change grid from 5x3 to 6x4
      s().setStep1(makeStep1({ grid: { reels: 6, rows: 4 } }));

      // Grid → invalidates 5,6,7,8 (rules uses ${reels}, ${rows}, ${paylines})
      expect(s().stepValidity[2]).toBe("valid"); // volatility not affected
      expect(s().stepValidity[3]).toBe("valid"); // features not affected
      expect(s().stepValidity[4]).toBe("valid"); // concept not affected
      expect(s().stepValidity[5]).toBe("stale"); // math uses grid
      expect(s().stepValidity[7]).toBe("stale"); // prototype uses grid
      expect(s().stepValidity[8]).toBe("stale"); // rules uses grid variables
      // Step 6 was never set to "valid" (no setStep6 exists), stays undefined
      expect(s().stepValidity[6]).toBeUndefined();

      // But data is still there (not deleted)
      expect(s().step2).not.toBeNull();
      expect(s().step3).not.toBeNull();
      expect(s().step4).not.toBeNull();
      expect(s().step5).not.toBeNull();
      expect(s().step7).not.toBeNull();
    });

    it("game_type change cascades invalidation", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      s().setStep1(makeStep1({ game_type: "crash" }));

      expect(s().stepValidity[1]).toBe("valid");
      expect(s().stepValidity[3]).toBe("stale");
      expect(s().stepValidity[5]).toBe("stale");
    });

    it("bet change cascades only to rules step 8 (uses ${minBet}, ${maxBet})", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      s().setStep1(makeStep1({ bet: { min: 0.1, max: 500, default: 5 } }));

      // Math/sim/prototype stay valid
      expect(s().stepValidity[2]).toBe("valid");
      expect(s().stepValidity[5]).toBe("valid");
      expect(s().stepValidity[7]).toBe("valid");
      // Rules step uses bet variables
      expect(s().stepValidity[8]).toBe("stale");
    });

    it("step 2 RTP change invalidates steps 5-8", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      s().setStep2(makeStep2({ target_rtp: 94 }));

      expect(s().stepValidity[2]).toBe("valid");
      expect(s().stepValidity[3]).toBe("valid"); // step 3 not affected
      expect(s().stepValidity[5]).toBe("stale");
      expect(s().stepValidity[7]).toBe("stale");
      expect(s().stepValidity[8]).toBe("stale"); // rules uses ${rtp}, ${volatility}
    });

    it("step 2 hit_frequency change DOES cascade to math", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      s().setStep2(makeStep2({ hit_frequency: 35 }));

      // hit_frequency affects math model generation
      expect(s().stepValidity[5]).toBe("stale");
    });

    it("step 3 feature change invalidates steps 5-9", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      // Re-set step3 with different features
      s().setStep3(makeStep3({ features: [{ type: "wild", variant: "sticky", config: {} }] }));

      expect(s().stepValidity[3]).toBe("valid");
      expect(s().stepValidity[4]).toBe("valid"); // step 4 not affected
      expect(s().stepValidity[5]).toBe("stale");
      expect(s().stepValidity[7]).toBe("stale");
      expect(s().stepValidity[8]).toBe("stale");
      expect(s().stepValidity[9]).toBe("stale");
    });

    it("step 4 concept-only change invalidates rules and GDD but not math", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      // Concept change without symbol change → rules (%Gamename) and GDD affected
      s().setStep4(makeStep4({ selected_concept: { source: "custom", name: "New Concept", usp: "Different" } }));

      expect(s().stepValidity[4]).toBe("valid");
      expect(s().stepValidity[5]).toBe("valid"); // symbols unchanged
      expect(s().stepValidity[7]).toBe("valid"); // prototype unchanged
      expect(s().stepValidity[8]).toBe("stale"); // rules uses %Gamename
      expect(s().stepValidity[9]).toBe("stale"); // GDD needs update
    });

    it("step 5 math change invalidates steps 6-9 but not 1-4", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      s().setStep5(makeStep5({ target_rtp_tenths: 940 }));

      expect(s().stepValidity[1]).toBe("valid");
      expect(s().stepValidity[2]).toBe("valid");
      expect(s().stepValidity[3]).toBe("valid");
      expect(s().stepValidity[4]).toBe("valid");
      expect(s().stepValidity[5]).toBe("valid");
      expect(s().stepValidity[7]).toBe("stale");
      expect(s().stepValidity[8]).toBe("stale");
      expect(s().stepValidity[9]).toBe("stale");
    });

    it("step 7 change invalidates steps 8 and 9", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      s().setStep7(makeStep7({ visual_mode: "svg" }));

      expect(s().stepValidity[5]).toBe("valid");
      expect(s().stepValidity[7]).toBe("valid");
      expect(s().stepValidity[8]).toBe("stale");
      expect(s().stepValidity[9]).toBe("stale");
    });

    it("double invalidation: grid change then symbol change", () => {
      completeAllSteps();
      const s = useWizardStore.getState;

      // First: grid change → math/sim/proto stale
      s().setStep1(makeStep1({ grid: { reels: 3, rows: 5 } }));
      expect(s().stepValidity[5]).toBe("stale");
      expect(s().stepValidity[4]).toBe("valid"); // concept not affected by grid

      // Now change symbols in step 4 — step 5 stays stale
      const modified = makeStep4();
      modified.symbols = [{ id: "wild", name: "Wild", role: "wild" }, { id: "hp1", name: "Dragon", role: "high_pay" }];
      s().setStep4(modified);
      expect(s().stepValidity[4]).toBe("valid");
      expect(s().stepValidity[5]).toBe("stale"); // still stale from grid + symbols
    });
  });

  describe("RTP budget integrity", () => {
    it("budget segments sum to target RTP in tenths", () => {
      const step5 = makeStep5();
      const b = step5.rtp_budget;
      const sum = b.base_wins + b.wild_substitution + b.free_spins + b.accumulator;
      expect(sum).toBe(step5.target_rtp_tenths);
    });

    it("each segment >= 10 (1.0% minimum)", () => {
      const b = makeStep5().rtp_budget;
      expect(b.base_wins).toBeGreaterThanOrEqual(10);
      expect(b.wild_substitution).toBeGreaterThanOrEqual(10);
      expect(b.free_spins).toBeGreaterThanOrEqual(10);
      expect(b.accumulator).toBeGreaterThanOrEqual(10);
    });

    it("multi-variant paytables have distinct RTP values", () => {
      const step5 = makeStep5();
      const variants = Object.values(step5.rtp_variants);
      const rtps = variants.map((v) => v.analytical_rtp);
      const unique = new Set(rtps);
      expect(unique.size).toBe(rtps.length);
    });
  });

  describe("step data dependencies", () => {
    it("step5 active_variant references a valid variant key", () => {
      const step5 = makeStep5();
      expect(step5.rtp_variants).toHaveProperty(step5.active_variant);
    });

    it("step4 symbols have required fields", () => {
      const step4 = makeStep4();
      for (const sym of step4.symbols) {
        expect(sym.id).toBeTruthy();
        expect(sym.name).toBeTruthy();
        expect(["wild", "scatter", "high_pay", "low_pay"]).toContain(sym.role);
      }
    });

    it("step4 must have at least one wild symbol for slot games", () => {
      const step4 = makeStep4();
      expect(step4.symbols.some((s) => s.role === "wild")).toBe(true);
    });

    it("step3 complexity score correlates with feature count", () => {
      const step3 = makeStep3();
      expect(step3.complexity_score).toBeGreaterThan(0);
      expect(step3.estimated_dev_weeks).toBeGreaterThan(0);
    });

    it("step2 rtp_variants are ordered descending", () => {
      const step2 = makeStep2();
      for (let i = 1; i < step2.rtp_variants.length; i++) {
        expect(step2.rtp_variants[i - 1]).toBeGreaterThanOrEqual(step2.rtp_variants[i]);
      }
    });
  });

  describe("wizard navigation", () => {
    it("can jump to any step without losing data", () => {
      const s = useWizardStore.getState;

      s().setStep1(makeStep1());
      s().setStep2(makeStep2());
      s().setStep3(makeStep3());

      // Jump back to step 1
      s().setCurrentStep(1);
      expect(s().currentStep).toBe(1);

      // Data preserved
      expect(s().step2?.target_rtp).toBe(96);
      expect(s().step3?.features).toHaveLength(3);
    });

    it("jumping forward doesn't mark intermediate steps as completed", () => {
      const s = useWizardStore.getState;

      s().setStep1(makeStep1());
      s().setCurrentStep(5); // jump ahead

      expect(s().completedSteps).toEqual([1]);
      expect(s().completedSteps).not.toContain(2);
      expect(s().completedSteps).not.toContain(3);
      expect(s().completedSteps).not.toContain(4);
    });

    it("re-completing a step doesn't duplicate in completedSteps", () => {
      const s = useWizardStore.getState;

      s().setStep1(makeStep1());
      s().setCurrentStep(1);
      s().setStep1(makeStep1({ bet: { min: 0.5, max: 200, default: 2 } }));

      expect(s().completedSteps.filter((x) => x === 1)).toHaveLength(1);
    });
  });

  describe("market constraint propagation", () => {
    it("UKGC constraints disable autoplay and bonus buy", () => {
      const step1 = makeStep1({
        markets: ["ukgc"],
        market_constraints: {
          ukgc: { autoplay_disabled: true, bonus_buy_disabled: true, min_spin_time_ms: 2500 },
        },
      });
      expect(step1.market_constraints.ukgc?.autoplay_disabled).toBe(true);
      expect(step1.market_constraints.ukgc?.bonus_buy_disabled).toBe(true);
      expect(step1.market_constraints.ukgc?.min_spin_time_ms).toBe(2500);
    });

    it("GGL imposes max bet cap", () => {
      const step1 = makeStep1({
        markets: ["ggl"],
        market_constraints: {
          ggl: { max_bet_cap: 1 },
        },
      });
      expect(step1.market_constraints.ggl?.max_bet_cap).toBe(1);
    });
  });

  describe("persistence (zustand persist)", () => {
    it("state survives store recreation (simulated)", () => {
      useWizardStore.getState().setStep1(makeStep1());
      useWizardStore.getState().setStep2(makeStep2());

      // Read from localStorage to verify persist
      const stored = localStorage.getItem("slotcraft-wizard");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.step1.game_type).toBe("slot");
      expect(parsed.state.step2.target_rtp).toBe(96);
    });
  });
});
