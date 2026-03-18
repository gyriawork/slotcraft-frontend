"use client";

import { useMemo } from "react";

interface ReelWeights {
  [symbol: string]: number;
}

interface Props {
  reelStrips: Record<string, ReelWeights>;
  stopsPerReel: number;
  /** Symbol roles for coloring: wild, scatter, high_pay, low_pay */
  symbolRoles?: Record<string, string>;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  wild: { bg: "bg-purple-500", text: "text-white" },
  scatter: { bg: "bg-yellow-500", text: "text-white" },
  high_pay: { bg: "bg-blue-500", text: "text-white" },
  low_pay: { bg: "bg-gray-400", text: "text-white" },
};

/**
 * Heatmap visualization of reel strip symbol distribution.
 * Each column = reel, each row = symbol. Cell intensity = weight/stops.
 */
export function ReelHeatmap({ reelStrips, stopsPerReel, symbolRoles }: Props) {
  const { reelNames, symbols, matrix } = useMemo(() => {
    const reelNames = Object.keys(reelStrips).sort();
    // Collect all unique symbols across reels
    const symSet = new Set<string>();
    for (const reel of Object.values(reelStrips)) {
      for (const sym of Object.keys(reel)) {
        symSet.add(sym);
      }
    }

    // Sort symbols: wild first, scatter, then high_pay, low_pay by ID
    const roleOrder = ["wild", "scatter", "high_pay", "low_pay"];
    const symbols = [...symSet].sort((a, b) => {
      const ra = roleOrder.indexOf(symbolRoles?.[a] ?? "low_pay");
      const rb = roleOrder.indexOf(symbolRoles?.[b] ?? "low_pay");
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });

    // Build weight matrix: [symbol][reel] → weight
    const matrix: number[][] = symbols.map((sym) =>
      reelNames.map((reel) => reelStrips[reel]?.[sym] ?? 0)
    );

    return { reelNames, symbols, matrix };
  }, [reelStrips, symbolRoles, stopsPerReel]);

  if (reelNames.length === 0 || symbols.length === 0) return null;

  // Find max weight for scaling
  const maxWeight = Math.max(1, ...matrix.flat());

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">Reel Strip Heatmap</h4>
      <p className="mb-3 text-xs text-gray-500">
        Cell value = stops on reel. Color intensity = probability ({stopsPerReel} stops/reel).
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-medium text-gray-500">Symbol</th>
              {reelNames.map((reel) => (
                <th key={reel} className="px-2 py-1 text-center font-medium text-gray-500 min-w-[50px]">
                  {reel.replace(/^reel/, "R")}
                </th>
              ))}
              <th className="px-2 py-1 text-center font-medium text-gray-500">Total</th>
              <th className="px-2 py-1 text-center font-medium text-gray-500">Avg %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {symbols.map((sym, si) => {
              const role = symbolRoles?.[sym] ?? "low_pay";
              const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.low_pay;
              const total = matrix[si].reduce((a, b) => a + b, 0);
              const avgPct = (total / (reelNames.length * stopsPerReel)) * 100;

              return (
                <tr key={sym}>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-3 w-3 rounded-sm ${roleColor.bg}`} />
                      <span className="font-medium text-gray-700">{sym}</span>
                    </div>
                  </td>
                  {matrix[si].map((weight, ri) => {
                    const intensity = weight / maxWeight;
                    const pct = (weight / stopsPerReel) * 100;
                    return (
                      <td
                        key={ri}
                        className="px-2 py-1.5 text-center"
                        title={`${sym} on ${reelNames[ri]}: ${weight} stops (${pct.toFixed(1)}%)`}
                      >
                        <span
                          className="inline-flex h-7 w-full items-center justify-center rounded text-xs font-mono"
                          style={{
                            backgroundColor: weight > 0
                              ? `rgba(124, 107, 245, ${0.1 + intensity * 0.7})`
                              : "transparent",
                            color: intensity > 0.5 ? "white" : weight > 0 ? "var(--accent)" : "var(--text3)",
                          }}
                        >
                          {weight}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center font-medium text-gray-600">{total}</td>
                  <td className="px-2 py-1.5 text-center text-gray-500">{avgPct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer: totals per reel */}
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="px-2 py-1.5 font-medium text-gray-500">Total</td>
              {reelNames.map((reel, ri) => {
                const colTotal = matrix.reduce((sum, row) => sum + row[ri], 0);
                return (
                  <td key={ri} className="px-2 py-1.5 text-center font-medium text-gray-600">
                    {colTotal}
                  </td>
                );
              })}
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
