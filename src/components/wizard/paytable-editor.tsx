"use client";

import { useCallback, useMemo } from "react";
import type { PaytableRow, ReelWeights } from "@/lib/wizard-types";

interface Props {
  rows: PaytableRow[];
  onChange: (rows: PaytableRow[]) => void;
  reels: number;
  /** Optional reel strips for probability-based RTP contribution */
  reelStrips?: Record<string, ReelWeights>;
  stopsPerReel?: number;
  paylines?: number;
}

/**
 * Calculate per-symbol RTP contribution using reel strip probabilities.
 * For match length n (left-to-right), probability =
 *   product(effective_weight_i / stops, i=1..n) × (n < reels ? (1 - eff_weight_(n+1)/stops) : 1)
 * RTP contribution = sum over n of P(n) × payout(n) × paylines
 */
function calcSymbolRtpContrib(
  symbolId: string,
  row: PaytableRow,
  reelStrips: Record<string, ReelWeights>,
  stopsPerReel: number,
  paylines: number,
  reelCount: number
): number {
  const maxMatch = Math.min(reelCount, 5);
  const reelKeys = Object.keys(reelStrips).sort();
  let totalContrib = 0;

  for (let n = 3; n <= maxMatch; n++) {
    const field = `x${n}` as "x3" | "x4" | "x5";
    const payout = row[field] || 0;
    if (payout <= 0) continue;

    // Probability of exactly n matching from left
    let prob = 1;
    for (let i = 0; i < n; i++) {
      if (i >= reelKeys.length) { prob = 0; break; }
      const weights = reelStrips[reelKeys[i]];
      const symW = weights[symbolId] ?? 0;
      const wildW = symbolId !== "wild" && symbolId !== "scatter" ? (weights.wild ?? 0) : 0;
      prob *= (symW + wildW) / stopsPerReel;
    }

    // For "exactly n" (not longer), multiply by (1 - P(match on reel n+1))
    if (n < reelCount && n < reelKeys.length) {
      const nextWeights = reelStrips[reelKeys[n]];
      const symW = nextWeights[symbolId] ?? 0;
      const wildW = symbolId !== "wild" && symbolId !== "scatter" ? (nextWeights.wild ?? 0) : 0;
      prob *= 1 - (symW + wildW) / stopsPerReel;
    }

    totalContrib += prob * payout * paylines;
  }

  return totalContrib;
}

export function PaytableEditor({ rows, onChange, reels, reelStrips, stopsPerReel, paylines }: Props) {
  const maxMatch = Math.min(reels, 5);
  const matchCols = Array.from({ length: maxMatch - 2 }, (_, i) => i + 3); // [3, 4, 5] for 5-reel
  const hasProbData = !!(reelStrips && stopsPerReel && stopsPerReel > 0 && paylines && paylines > 0);

  const updateCell = useCallback(
    (rowIdx: number, field: "x3" | "x4" | "x5", rawValue: string) => {
      const val = parseFloat(rawValue);
      if (isNaN(val) || val < 0) return;
      const rounded = Math.round(val * 10000) / 10000;
      const updated = rows.map((r, i) =>
        i === rowIdx ? { ...r, [field]: rounded } : r
      );
      onChange(updated);
    },
    [rows, onChange]
  );

  // Compute RTP contributions
  const contributions = useMemo(() => {
    if (hasProbData) {
      // Probability-weighted RTP contribution per symbol
      return rows.map((row) =>
        calcSymbolRtpContrib(row.symbol_id, row, reelStrips!, stopsPerReel!, paylines!, reels)
      );
    }
    // Fallback: proportional to payout sum
    const totalPaySum = rows.reduce((s, r) => s + (r.x3 || 0) + (r.x4 || 0) + (r.x5 || 0), 0);
    return rows.map((row) => {
      const paySum = (row.x3 || 0) + (row.x4 || 0) + (row.x5 || 0);
      return totalPaySum > 0 ? paySum / totalPaySum : 0;
    });
  }, [rows, reelStrips, stopsPerReel, paylines, reels, hasProbData]);

  const totalContrib = contributions.reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Paytable</h4>
        {hasProbData && totalContrib > 0 && (
          <span className="text-xs text-gray-500">
            Base game RTP estimate: <span className="font-medium text-gray-700">{(totalContrib * 100).toFixed(2)}%</span>
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-medium text-gray-600">Symbol</th>
              {matchCols.map((n) => (
                <th key={n} className="px-3 py-2 text-center font-medium text-gray-600">
                  {n}-of-a-kind
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium text-gray-600">RTP Contrib.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, ri) => {
              const contrib = contributions[ri];
              const contribPct = hasProbData
                ? contrib * 100 // Already a fraction of total bet
                : totalContrib > 0 ? (contrib / totalContrib) * 100 : 0; // Fallback: % share
              const barMax = hasProbData
                ? Math.max(...contributions) * 100
                : 100;

              return (
                <tr key={row.symbol_id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-800">{row.label}</span>
                    <span className="ml-1 text-xs text-gray-400">({row.symbol_id})</span>
                  </td>
                  {matchCols.map((n) => {
                    const field = `x${n}` as "x3" | "x4" | "x5";
                    return (
                      <td key={n} className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-20 rounded border border-gray-200 px-2 py-1 text-center text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={row[field]?.toFixed(2) ?? "0.00"}
                          onChange={(e) => updateCell(ri, field, e.target.value)}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-400"
                          style={{ width: `${barMax > 0 ? Math.min((contribPct / barMax) * 100, 100) : 0}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-gray-500">
                        {contribPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
