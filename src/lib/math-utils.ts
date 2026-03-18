/** Math utility functions for Step 5 Player Feel Cards */

import type { ReelWeights, PaytableRow } from "./wizard-types";

/**
 * Calculate the probability of at least one wild appearing on any reel per spin.
 * P(at least one wild) = 1 - product(1 - wild_weight_i / total_stops_i) for each reel.
 */
export function calcWildChance(
  reelStrips: Record<string, ReelWeights>,
  stopsPerReel: number
): number {
  const reelKeys = Object.keys(reelStrips);
  if (reelKeys.length === 0 || stopsPerReel <= 0) return 0;

  let probNoWild = 1;
  for (const key of reelKeys) {
    const weights = reelStrips[key];
    const wildWeight = weights.wild ?? 0;
    probNoWild *= 1 - wildWeight / stopsPerReel;
  }
  return 1 - probNoWild;
}

/**
 * Calculate the average bonus payout as a multiplier of bet.
 * avg_bonus_payout = (free_spins_rtp_tenths / 10 / 100) * (1 / bonus_frequency_fraction)
 * where bonus_frequency_fraction = bonus_frequency / 100 if bonus_frequency is a percentage,
 * or 1/bonus_frequency if it's "1 in N".
 *
 * @param freeSpinsRtpTenths - Free spins RTP allocation in tenths of percent (e.g. 96 = 9.6%)
 * @param bonusFrequency - Bonus frequency from Step 2 (spins between bonuses, e.g. 150 means 1 in 150)
 */
export function calcAvgBonusPayout(
  freeSpinsRtpTenths: number,
  bonusFrequency: number
): number {
  if (bonusFrequency <= 0 || freeSpinsRtpTenths <= 0) return 0;
  // freeSpinsRtpTenths = 96 means 9.6% of RTP goes to free spins
  // That means per spin, free spins contribute 9.6% of bet on average
  // Since bonus triggers every bonusFrequency spins, each trigger pays:
  // (freeSpinsRtpTenths / 10 / 100) * bonusFrequency
  return (freeSpinsRtpTenths / 10 / 100) * bonusFrequency;
}

/**
 * Calculate the approximate probability of hitting the maximum possible single-spin win.
 * Uses the highest-paying symbol's x5 (or max match) payout, assumes all reels must show it.
 * P(max win) = (symbol_weight / stops_per_reel) ^ reels * paylines
 *
 * This is a rough approximation for display purposes.
 *
 * @param paytable - The paytable rows
 * @param reelStrips - Reel strip weights
 * @param stopsPerReel - Stops per reel
 * @param paylines - Number of paylines
 * @param reels - Number of reels
 */
export function calcMaxWinProbability(
  paytable: PaytableRow[],
  reelStrips: Record<string, ReelWeights>,
  stopsPerReel: number,
  paylines: number,
  reels: number
): number {
  if (stopsPerReel <= 0 || paylines <= 0 || reels <= 0) return 0;

  // Find the highest paying non-wild, non-scatter symbol (by x5 payout)
  let bestSymbol: PaytableRow | null = null;
  for (const row of paytable) {
    if (row.symbol_id === "wild" || row.symbol_id === "scatter") continue;
    if (row.x5 <= 0) continue;
    if (!bestSymbol || row.x5 > bestSymbol.x5) {
      bestSymbol = row;
    }
  }
  if (!bestSymbol) return 0;

  // Probability of this symbol appearing on all reels for one payline
  const reelKeys = Object.keys(reelStrips);
  let probAllReels = 1;
  for (const key of reelKeys) {
    const weights = reelStrips[key];
    // Wild can substitute, so effective weight = symbol_weight + wild_weight
    const symWeight = (weights[bestSymbol.symbol_id] ?? 0) + (weights.wild ?? 0);
    probAllReels *= symWeight / stopsPerReel;
  }

  // Multiply by paylines for rough chance per spin
  return probAllReels * paylines;
}

/**
 * Format probability as "1 in N" string.
 */
export function formatProbability(prob: number): string {
  if (prob <= 0) return "—";
  if (prob >= 1) return "1 in 1";
  const n = Math.round(1 / prob);
  if (n >= 1_000_000) return `1 in ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `1 in ${(n / 1_000).toFixed(1)}K`;
  return `1 in ${n}`;
}
