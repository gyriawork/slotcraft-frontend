import { describe, it, expect } from "vitest";
import { buildProductSheetData } from "./product-sheet-utils";

const SAMPLE_WIZARD = {
  step1: {
    game_type: "slot",
    variant: "video_slot",
    grid: { reels: 5, rows: 3 },
    paylines: 20,
    bet_range: { min: 0.2, max: 100 },
    markets: ["eu_mainstream", "asia_vip"],
  },
  step2: {
    target_rtp: 96.5,
    volatility: "high",
    hit_frequency: 28.5,
    max_win: 5000,
    bonus_frequency: 3.5,
  },
  step3: {
    features: ["wilds", "free_spins", "cascade", "bonus_buy"],
  },
  step4: {
    theme: { description: "Norse mythology with cosmic storms" },
    naming: { selected: "Viking Thunder" },
    symbols: [
      { id: "wild", name: "Odin", role: "wild" },
      { id: "scatter", name: "Runestone", role: "scatter" },
    ],
    art_direction: { style: "Dark cinematic 3D with lightning effects" },
  },
  step6: {
    rtp: 96.48,
    hit_frequency: 28.3,
    max_win: 5123,
    pass: true,
    spins: 10000000,
  },
};

describe("Product Sheet Utils", () => {
  it("builds product sheet data from wizard data", () => {
    const sheet = buildProductSheetData(SAMPLE_WIZARD, "Viking Thunder");
    expect(sheet.title).toBe("Viking Thunder");
    expect(sheet.game_type).toBe("Video Slot");
    expect(sheet.grid).toBe("5x3");
    expect(sheet.rtp).toBe("96.48%");
    expect(sheet.volatility).toBe("High");
    expect(sheet.max_win).toBe("5,123x");
    expect(sheet.features).toContain("Wilds");
    expect(sheet.features).toContain("Free Spins");
    expect(sheet.description).toContain("Norse mythology");
  });

  it("handles missing step data gracefully", () => {
    const sheet = buildProductSheetData({}, "Unknown Game");
    expect(sheet.title).toBe("Unknown Game");
    expect(sheet.rtp).toBe("—");
    expect(sheet.volatility).toBe("—");
    expect(sheet.features).toEqual([]);
  });

  it("uses simulation RTP over target RTP when available", () => {
    const sheet = buildProductSheetData(SAMPLE_WIZARD, "Viking Thunder");
    expect(sheet.rtp).toBe("96.48%"); // from step6, not step2
  });

  it("formats bet range", () => {
    const sheet = buildProductSheetData(SAMPLE_WIZARD, "Viking Thunder");
    expect(sheet.bet_range).toBe("$0.20 – $100.00");
  });

  it("lists paylines", () => {
    const sheet = buildProductSheetData(SAMPLE_WIZARD, "Viking Thunder");
    expect(sheet.paylines).toBe("20");
  });
});
