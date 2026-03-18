"use client";

import { useCallback, useRef } from "react";
import type { ReelWeights } from "@/lib/wizard-types";

interface Props {
  /** reel_strips: { reel1: { sym: weight }, reel2: ... } */
  reelStrips: Record<string, ReelWeights>;
  stopsPerReel: number;
  symbolLabels: Record<string, string>;
  onChange: (strips: Record<string, ReelWeights>) => void;
}

/** Heatmap: returns inline background color based on weight ratio */
function heatBg(weight: number, max: number): string {
  if (max === 0) return "rgba(124, 107, 245, 0.05)";
  const ratio = weight / max;
  const alpha = 0.05 + ratio * 0.45; // 0.05 → 0.50
  return `rgba(124, 107, 245, ${alpha.toFixed(2)})`;
}

export function ReelStripEditor({ reelStrips, stopsPerReel, symbolLabels, onChange }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reelKeys = Object.keys(reelStrips).sort();
  const allSymbols = Array.from(
    new Set(reelKeys.flatMap((rk) => Object.keys(reelStrips[rk])))
  ).sort();

  // Find max weight for heatmap scale
  let maxWeight = 0;
  for (const rk of reelKeys) {
    for (const sym of allSymbols) {
      const w = reelStrips[rk]?.[sym] ?? 0;
      if (w > maxWeight) maxWeight = w;
    }
  }

  const updateWeight = useCallback(
    (reel: string, symbol: string, rawValue: string) => {
      const val = parseInt(rawValue, 10);
      if (isNaN(val) || val < 0) return;

      // Check reel total won't exceed stops_per_reel
      const currentWeights = reelStrips[reel];
      const otherTotal = Object.entries(currentWeights)
        .filter(([k]) => k !== symbol)
        .reduce((s, [, v]) => s + v, 0);
      const clamped = Math.min(val, stopsPerReel - otherTotal);
      if (clamped < 0) return;

      const updated = {
        ...reelStrips,
        [reel]: { ...currentWeights, [symbol]: clamped },
      };

      // Debounce onChange (300ms per PITFALLS.md)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(updated);
      }, 300);
    },
    [reelStrips, stopsPerReel, onChange]
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Reel Strips</h4>
      <p className="text-xs" style={{ color: "var(--text3)" }}>
        Each reel must total {stopsPerReel} stops. Edit weights directly.
      </p>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg2)" }}>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Symbol</th>
              {reelKeys.map((rk) => {
                const sum = allSymbols.reduce((s, sym) => s + (reelStrips[rk]?.[sym] ?? 0), 0);
                return (
                  <th key={rk} className="px-3 py-2 text-center font-medium" style={{ color: "var(--text2)" }}>
                    <div>{rk.replace("reel", "Reel ")}</div>
                    <div
                      className="text-xs font-normal"
                      style={{ color: sum === stopsPerReel ? "var(--green)" : "var(--red)" }}
                    >
                      {sum}/{stopsPerReel}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center font-medium" style={{ color: "var(--text2)" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {allSymbols.map((sym) => {
              const totalForSym = reelKeys.reduce((s, rk) => s + (reelStrips[rk]?.[sym] ?? 0), 0);
              return (
                <tr
                  key={sym}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-3 py-1.5 font-medium" style={{ color: "var(--text)" }}>
                    {symbolLabels[sym] ?? sym}
                  </td>
                  {reelKeys.map((rk) => {
                    const w = reelStrips[rk]?.[sym] ?? 0;
                    const pct = stopsPerReel > 0 ? ((w / stopsPerReel) * 100).toFixed(1) : "0.0";
                    return (
                      <td key={rk} className="px-2 py-1 text-center">
                        <div className="rounded p-0.5" style={{ background: heatBg(w, maxWeight) }}>
                          <input
                            type="number"
                            min="0"
                            max={stopsPerReel}
                            className="w-14 rounded border px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1"
                            style={{
                              background: "var(--surface)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                            defaultValue={w}
                            onChange={(e) => updateWeight(rk, sym, e.target.value)}
                            title={`${symbolLabels[sym] ?? sym}: ${w}/${stopsPerReel} (${pct}%)`}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-center text-xs" style={{ color: "var(--text3)" }}>{totalForSym}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
