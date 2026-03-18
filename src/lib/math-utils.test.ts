import { describe, it, expect } from "vitest";
import {
  calcWildChance,
  calcAvgBonusPayout,
  calcMaxWinProbability,
  formatProbability,
} from "./math-utils";
import type { ReelWeights, PaytableRow } from "./wizard-types";

const makeReelStrips = (wildWeight: number, stopsPerReel: number, reelCount: number) => {
  const strips: Record<string, ReelWeights> = {};
  for (let i = 1; i <= reelCount; i++) {
    strips[`reel${i}`] = {
      wild: wildWeight,
      scatter: 2,
      hp1: 3,
      lp1: stopsPerReel - wildWeight - 2 - 3,
    };
  }
  return strips;
};

describe("calcWildChance", () => {
  it("returns 0 for empty reel strips", () => {
    expect(calcWildChance({}, 60)).toBe(0);
  });

  it("returns 0 when stopsPerReel is 0", () => {
    expect(calcWildChance(makeReelStrips(2, 60, 5), 0)).toBe(0);
  });

  it("returns 0 when no wilds on any reel", () => {
    expect(calcWildChance(makeReelStrips(0, 60, 5), 60)).toBe(0);
  });

  it("calculates correctly for uniform reels", () => {
    // 5 reels, 2 wilds out of 60 stops each
    // P(no wild on reel) = 58/60 = 0.96667
    // P(no wild any reel) = 0.96667^5 ≈ 0.8434
    // P(at least one wild) ≈ 0.1566
    const result = calcWildChance(makeReelStrips(2, 60, 5), 60);
    expect(result).toBeCloseTo(0.1559, 3);
  });

  it("returns 1 when all stops are wild", () => {
    const strips = { reel1: { wild: 60 } };
    expect(calcWildChance(strips, 60)).toBeCloseTo(1, 5);
  });

  it("handles single reel", () => {
    // 1 reel, 10 wilds out of 60 = 10/60 = 0.1667
    const result = calcWildChance(makeReelStrips(10, 60, 1), 60);
    expect(result).toBeCloseTo(10 / 60, 4);
  });
});

describe("calcAvgBonusPayout", () => {
  it("returns 0 when bonusFrequency is 0", () => {
    expect(calcAvgBonusPayout(96, 0)).toBe(0);
  });

  it("returns 0 when freeSpinsRtpTenths is 0", () => {
    expect(calcAvgBonusPayout(0, 150)).toBe(0);
  });

  it("calculates correctly", () => {
    // freeSpinsRtpTenths = 96 → 9.6% of RTP
    // bonusFrequency = 150 → 1 in 150
    // avg_bonus_payout = 0.096 * 150 = 14.4x
    expect(calcAvgBonusPayout(96, 150)).toBeCloseTo(14.4, 1);
  });

  it("handles small RTP allocation", () => {
    // 50 tenths = 5.0%
    // 1 in 100
    // 0.05 * 100 = 5.0x
    expect(calcAvgBonusPayout(50, 100)).toBeCloseTo(5.0, 1);
  });
});

describe("calcMaxWinProbability", () => {
  const paytable: PaytableRow[] = [
    { symbol_id: "wild", label: "Wild", x3: 0, x4: 0, x5: 0 },
    { symbol_id: "scatter", label: "Scatter", x3: 0, x4: 0, x5: 0 },
    { symbol_id: "hp1", label: "HP1", x3: 10, x4: 50, x5: 250 },
    { symbol_id: "lp1", label: "LP1", x3: 2, x4: 5, x5: 20 },
  ];

  it("returns 0 for empty paytable", () => {
    expect(calcMaxWinProbability([], makeReelStrips(2, 60, 5), 60, 20, 5)).toBe(0);
  });

  it("returns 0 when stopsPerReel is 0", () => {
    expect(calcMaxWinProbability(paytable, makeReelStrips(2, 60, 5), 0, 20, 5)).toBe(0);
  });

  it("returns 0 when no symbols have x5 payouts", () => {
    const noPaytable: PaytableRow[] = [
      { symbol_id: "hp1", label: "HP1", x3: 0, x4: 0, x5: 0 },
    ];
    expect(calcMaxWinProbability(noPaytable, makeReelStrips(2, 60, 5), 60, 20, 5)).toBe(0);
  });

  it("calculates probability using best symbol + wild substitution", () => {
    // hp1 is the best (x5=250), it has weight 3, wild has weight 2 → effective weight = 5
    // P(hp1 or wild on reel) = 5/60 for each of 5 reels
    // P(all reels) = (5/60)^5
    // P(per spin) = (5/60)^5 * 20 paylines
    const result = calcMaxWinProbability(paytable, makeReelStrips(2, 60, 5), 60, 20, 5);
    const expected = Math.pow(5 / 60, 5) * 20;
    expect(result).toBeCloseTo(expected, 10);
  });

  it("handles single payline single reel", () => {
    const strips = makeReelStrips(2, 60, 1);
    const result = calcMaxWinProbability(paytable, strips, 60, 1, 1);
    // hp1 has weight 3, wild 2 → 5/60 * 1 payline
    expect(result).toBeCloseTo(5 / 60, 4);
  });
});

describe("formatProbability", () => {
  it("returns — for 0", () => {
    expect(formatProbability(0)).toBe("—");
  });

  it("returns — for negative", () => {
    expect(formatProbability(-0.5)).toBe("—");
  });

  it("formats small probabilities with K suffix", () => {
    expect(formatProbability(1 / 5000)).toBe("1 in 5.0K");
  });

  it("formats very small probabilities with M suffix", () => {
    expect(formatProbability(1 / 2_000_000)).toBe("1 in 2.0M");
  });

  it("formats moderate probabilities as integers", () => {
    expect(formatProbability(1 / 150)).toBe("1 in 150");
  });

  it("returns 1 in 1 for probability >= 1", () => {
    expect(formatProbability(1)).toBe("1 in 1");
  });
});
