import { describe, it, expect } from "vitest";
import {
  SAMPLE_PROJECT_NAME,
  sampleStep1,
  sampleStep2,
  sampleStep3,
  sampleStep4,
  sampleStep5,
  sampleStep6,
  sampleStep7,
  sampleStep8,
  sampleStep9,
  sampleStepData,
} from "@/lib/sample-project";

describe("sample-project data integrity", () => {
  it("has a non-empty project name", () => {
    expect(SAMPLE_PROJECT_NAME.length).toBeGreaterThan(0);
  });

  it("step1: valid 5x3 slot config", () => {
    expect(sampleStep1.game_type).toBe("slot");
    expect(sampleStep1.grid.reels).toBe(5);
    expect(sampleStep1.grid.rows).toBe(3);
    expect(sampleStep1.paylines).toBe(20);
    expect(sampleStep1.markets.length).toBeGreaterThan(0);
  });

  it("step2: RTP and volatility within valid ranges", () => {
    expect(sampleStep2.target_rtp).toBeGreaterThanOrEqual(85);
    expect(sampleStep2.target_rtp).toBeLessThanOrEqual(99);
    expect(sampleStep2.hit_frequency).toBeGreaterThan(0);
    expect(sampleStep2.hit_frequency).toBeLessThan(100);
    expect(sampleStep2.max_win).toBeGreaterThan(0);
    expect(sampleStep2.rtp_variants.length).toBeGreaterThanOrEqual(2);
  });

  it("step3: has at least one feature", () => {
    expect(sampleStep3.features.length).toBeGreaterThan(0);
    expect(sampleStep3.complexity_score).toBeGreaterThan(0);
  });

  it("step4: symbols include wild and scatter", () => {
    const roles = sampleStep4.symbols.map((s) => s.role);
    expect(roles).toContain("wild");
    expect(roles).toContain("scatter");
    expect(roles).toContain("high_pay");
    expect(roles).toContain("low_pay");
    expect(sampleStep4.selected_concept).not.toBeNull();
    expect(sampleStep4.sub_steps_complete.every(Boolean)).toBe(true);
  });

  it("step5: RTP budget sums to target (integer tenths)", () => {
    const b = sampleStep5.rtp_budget;
    const total = b.base_wins + b.wild_substitution + b.free_spins + b.accumulator;
    expect(total).toBe(sampleStep5.target_rtp_tenths);
  });

  it("step5: reel strips have all symbols from step4", () => {
    const symbolIds = sampleStep4.symbols.map((s) => s.id);
    const variant = sampleStep5.rtp_variants[sampleStep5.active_variant];
    expect(variant).toBeDefined();
    const reelSymbols = Object.keys(variant.reel_strips.reel1);
    for (const id of symbolIds) {
      expect(reelSymbols).toContain(id);
    }
  });

  it("step5: stops per reel matches sum of weights", () => {
    const variant = sampleStep5.rtp_variants[sampleStep5.active_variant];
    for (const [, weights] of Object.entries(variant.reel_strips)) {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBe(variant.stops_per_reel);
    }
  });

  it("step5: paytable symbol IDs reference step4 symbols", () => {
    const symbolIds = new Set(sampleStep4.symbols.map((s) => s.id));
    const variant = sampleStep5.rtp_variants[sampleStep5.active_variant];
    for (const row of variant.paytable) {
      expect(symbolIds.has(row.symbol_id)).toBe(true);
    }
  });

  it("step6: simulation passed with RTP near target", () => {
    expect(sampleStep6.pass).toBe(true);
    expect(Math.abs(sampleStep6.rtp - sampleStep2.target_rtp)).toBeLessThan(1);
    expect(sampleStep6.spins).toBeGreaterThanOrEqual(1000000);
  });

  it("step7: has valid prototype config", () => {
    expect(["emoji", "svg", "custom"]).toContain(sampleStep7.visual_mode);
    expect(["dark", "light", "wireframe"]).toContain(sampleStep7.ui_skin);
  });

  it("step8: has valid rules & translations config", () => {
    expect(sampleStep8.template).toBeDefined();
    expect(sampleStep8.template.source_lang).toBe("en");
    expect(sampleStep8.template.content.length).toBeGreaterThan(0);
    expect(sampleStep8.languages.length).toBeGreaterThan(0);
    expect(Object.keys(sampleStep8.variables).length).toBeGreaterThan(0);
    expect(Object.keys(sampleStep8.translations).length).toBeGreaterThan(0);
  });

  it("step9: all sections marked ready", () => {
    expect(sampleStep9.sections.length).toBeGreaterThan(0);
    expect(sampleStep9.sections.every((s) => s.ready)).toBe(true);
  });

  it("sampleStepData contains all 9 steps", () => {
    expect(sampleStepData.step1).toBeDefined();
    expect(sampleStepData.step2).toBeDefined();
    expect(sampleStepData.step3).toBeDefined();
    expect(sampleStepData.step4).toBeDefined();
    expect(sampleStepData.step5).toBeDefined();
    expect(sampleStepData.step6).toBeDefined();
    expect(sampleStepData.step7).toBeDefined();
    expect(sampleStepData.step8).toBeDefined();
    expect(sampleStepData.step9).toBeDefined();
  });

  it("cross-step consistency: grid reels match reel strip count", () => {
    const reelCount = sampleStep1.grid.reels;
    const variant = sampleStep5.rtp_variants[sampleStep5.active_variant];
    expect(Object.keys(variant.reel_strips).length).toBe(reelCount);
  });

  it("cross-step consistency: step5 variant keys are subset of step2 rtp_variants", () => {
    for (const key of Object.keys(sampleStep5.rtp_variants)) {
      const rtp = parseFloat(key);
      expect(sampleStep2.rtp_variants).toContain(rtp);
    }
  });
});
