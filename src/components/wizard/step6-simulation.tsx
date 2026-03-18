"use client";

import { useState } from "react";
import { useSimulation } from "@/lib/use-simulation";
import { api } from "@/lib/api";
import type { SimResult, RustSymbol, SimulationConfig } from "@/lib/simulation";
import type { Step1Data, Step2Data, Step3Data, Step5Data, Step6Data } from "@/lib/wizard-types";
import { BankrollPaths } from "./bankroll-paths";

const SPIN_PRESETS = [
  { label: "Quick (10K)", value: 10_000 },
  { label: "Standard (100K)", value: 100_000 },
  { label: "Full (500K)", value: 500_000 },
  { label: "Deep (1M)", value: 1_000_000 },
];

/** Map symbol ID strings to Rust Symbol enum format */
const SYMBOL_ID_TO_RUST: Record<string, RustSymbol> = {
  wild: "Wild",
  scatter: "Scatter",
  hp1: { Regular: 0 },
  hp2: { Regular: 1 },
  hp3: { Regular: 2 },
  hp4: { Regular: 3 },
  lp1: { Regular: 4 },
  lp2: { Regular: 5 },
  lp3: { Regular: 6 },
  lp4: { Regular: 7 },
  lp5: { Regular: 8 },
  lp6: { Regular: 9 },
};

interface Step6Props {
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step5?: Step5Data | null;
  data?: Step6Data;
  onUpdate: (data: Step6Data) => void;
  onBack: () => void;
}

export function Step6Simulation({ step1, step2, step3, step5, data, onUpdate, onBack }: Step6Props) {
  const { status, result, error, simulate, reset } = useSimulation();
  const [spinCount, setSpinCount] = useState(100_000);
  const [serverVerifying, setServerVerifying] = useState(false);
  const [serverResult, setServerResult] = useState<SimResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const canRun = step1 && step2;

  function buildConfig(): SimulationConfig | null {
    if (!step1 || !step2) return null;

    const numReels = step1.grid.reels;
    const numRows = step1.grid.rows;

    // Use Step 5 math model data when available for accurate verification
    const variant = step5?.rtp_variants[step5.active_variant];

    let reel_strips: SimulationConfig["reel_strips"];
    let paytable: SimulationConfig["paytable"];

    if (variant) {
      // Build reel strips from Step 5 data
      reel_strips = [];
      for (let r = 1; r <= numReels; r++) {
        const weights = variant.reel_strips[`reel${r}`];
        if (!weights) continue;
        const rustWeights: Array<[RustSymbol, number]> = [];
        for (const [symId, weight] of Object.entries(weights)) {
          const rustSym = SYMBOL_ID_TO_RUST[symId];
          if (rustSym && weight > 0) {
            rustWeights.push([rustSym, weight]);
          }
        }
        reel_strips.push({ weights: rustWeights });
      }

      // Build paytable from Step 5 data
      paytable = [];
      for (const row of variant.paytable) {
        const rustSym = SYMBOL_ID_TO_RUST[row.symbol_id];
        if (!rustSym) continue;
        if (row.x3 > 0) paytable.push({ symbol: rustSym, count: 3, payout: row.x3 });
        if (row.x4 > 0) paytable.push({ symbol: rustSym, count: 4, payout: row.x4 });
        if (row.x5 > 0) paytable.push({ symbol: rustSym, count: 5, payout: row.x5 });
      }
    } else {
      // Fallback: generate default reel strips from volatility
      const weights: [RustSymbol, number][] = [
        ...Array.from({ length: 3 }, (_, i): [RustSymbol, number] => [{ Regular: i }, 5 + i * 2]),
        ...Array.from({ length: 3 }, (_, i): [RustSymbol, number] => [{ Regular: i + 3 }, 10 + i * 3]),
        ["Wild" as const, 3],
        ["Scatter" as const, 2],
      ];
      reel_strips = Array(numReels).fill({ weights });

      const volMultiplier =
        step2.volatility === "extreme" ? 3 :
        step2.volatility === "high" ? 2.5 :
        step2.volatility === "med_high" ? 2 :
        step2.volatility === "med" ? 1.5 :
        step2.volatility === "med_low" ? 1.2 : 1;

      paytable = [];
      for (let sym = 0; sym < 6; sym++) {
        const basePay = sym < 3 ? (3 - sym) * 2 * volMultiplier : (3 - (sym - 3)) * 0.5;
        for (let count = 3; count <= Math.min(numReels, 5); count++) {
          const multiplier = count === 3 ? 1 : count === 4 ? 3 : 10;
          paytable.push({
            symbol: { Regular: sym } as RustSymbol,
            count,
            payout: basePay * multiplier,
          });
        }
      }
    }

    // Build paylines
    const paylineCount = step1.win_mechanic === "all_ways" ? 0 :
      step1.paylines || Math.min(20, numRows * numReels);
    const paylines: number[][] = [];
    if (numRows === 1) {
      paylines.push(Array(numReels).fill(0));
    } else {
      for (let i = 0; i < Math.max(paylineCount, 1); i++) {
        paylines.push(Array.from({ length: numReels }, () => i % numRows));
      }
      if (numRows >= 3 && numReels >= 3 && paylines.length < 5) {
        paylines.push([0, 1, 2, 1, 0].slice(0, numReels));
        paylines.push([2, 1, 0, 1, 2].slice(0, numReels));
      }
    }

    const hasCascade = step3?.features.some((f) => f.variant === "accumulator") ?? false;
    const hasFreeSpins = step3?.features.some((f) => f.variant === "free_spins") ?? false;
    const hasAccumulator = step3?.features.some((f) => f.variant === "accumulator") ?? false;

    // Determine wild type from step3 features
    const wildFeature = step3?.features.find((f) => f.type === "wild");
    let wildType: SimulationConfig["features"]["wild_config"]["wild_type"] = "Standard";
    if (wildFeature) {
      switch (wildFeature.variant) {
        case "expanding": wildType = "Expanding"; break;
        case "sticky": wildType = "Sticky"; break;
        case "walking": wildType = "Walking"; break;
        case "multiplier": {
          const mult = (wildFeature.config?.multiplier as number) || 2;
          wildType = { Multiplier: mult };
          break;
        }
        case "stacked": {
          const height = (wildFeature.config?.stack_height as number) || 3;
          wildType = { Stacked: height };
          break;
        }
        default: wildType = "Standard";
      }
    }

    return {
      reels: numReels,
      rows: numRows,
      reel_strips,
      paytable,
      paylines,
      features: {
        cascade_enabled: hasCascade,
        accumulator_tiers: hasAccumulator
          ? [
              { min_cascades: 1, max_cascades: 3, multiplier: 1 },
              { min_cascades: 4, max_cascades: 6, multiplier: 2 },
              { min_cascades: 7, max_cascades: 10, multiplier: 5 },
            ]
          : [],
        free_spins_enabled: hasFreeSpins,
        free_spin_awards: hasFreeSpins ? ({ "3": 10, "4": 15, "5": 25 } as Record<string, number>) : ({} as Record<string, number>),
        retrigger_spins: hasFreeSpins ? 5 : 0,
        max_total_free_spins: 50,
        wild_config: { wild_type: wildType },
      },
      bet: step1.bet.default,
    };
  }

  async function handleRun() {
    const config = buildConfig();
    if (!config) return;
    const seed = Math.floor(Math.random() * 2 ** 32);
    const simResult = await simulate(config, spinCount, seed);
    if (simResult) {
      const rtpTolerance = 0.5; // within 0.5% of target
      const pass = step2
        ? Math.abs(simResult.rtp - step2.target_rtp) < rtpTolerance
        : true;
      onUpdate({
        rtp: simResult.rtp,
        hit_frequency: simResult.hit_frequency,
        bonus_frequency: simResult.bonus_frequency,
        max_win: simResult.max_win,
        volatility_sd: simResult.volatility_sd,
        spins: simResult.spins,
        total_wagered: simResult.total_wagered,
        total_won: simResult.total_won,
        winning_spins: simResult.winning_spins,
        bonus_triggers: simResult.bonus_triggers,
        distribution_buckets: simResult.distribution_buckets,
        timestamp: new Date().toISOString(),
        seed,
        pass,
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Controls */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Monte Carlo Simulation</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Verify math model with WASM engine running in your browser
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {SPIN_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setSpinCount(preset.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    spinCount === preset.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRun}
              disabled={!canRun || status === "running"}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "running" ? "Running..." : "Run Simulation"}
            </button>
          </div>
        </div>

        {!canRun && (
          <p className="mt-3 text-xs text-amber-600">
            Complete Steps 1 and 2 before running simulation
          </p>
        )}
      </section>

      {/* Live Progress */}
      {status === "running" && (
        <div className="rounded-lg border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Simulation Running...</span>
            <span className="text-xs" style={{ color: "var(--text3)" }}>{spinCount.toLocaleString()} spins</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg4)" }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: "var(--accent)", width: "60%" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results — current run */}
      {result && <SimulationResults result={result} targetRtp={step2?.target_rtp} />}

      {/* Verification Result */}
      {data && (
        <div className="flex items-center gap-3 rounded-lg border p-4" style={{
          background: data.pass ? "var(--green-soft)" : "var(--red-soft)",
          borderColor: data.pass ? "var(--green-border)" : "rgba(239, 96, 96, 0.3)",
        }}>
          <span className="text-2xl">{data.pass ? "\u2713" : "\u2717"}</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: data.pass ? "var(--green)" : "var(--red)" }}>
              {data.pass ? "Simulation Passed" : "Simulation Failed"}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
              RTP {data.rtp.toFixed(2)}% {step2?.target_rtp ? `(target: ${step2.target_rtp}%)` : ""}
            </div>
          </div>
        </div>
      )}

      {/* Saved results from previous run (when no current result) */}
      {!result && data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Previous Simulation Results</h4>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                data.pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {data.pass ? "PASS" : "FAIL"}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(data.timestamp).toLocaleString()} — {data.spins.toLocaleString()} spins
              </span>
            </div>
          </div>
          <SimulationResults
            result={{
              spins: data.spins,
              total_wagered: data.total_wagered,
              total_won: data.total_won,
              sum_win_squared: 0,
              winning_spins: data.winning_spins,
              bonus_triggers: data.bonus_triggers,
              max_win: data.max_win,
              distribution_buckets: data.distribution_buckets,
              rtp: data.rtp,
              hit_frequency: data.hit_frequency,
              bonus_frequency: data.bonus_frequency,
              volatility_sd: data.volatility_sd,
            }}
            targetRtp={step2?.target_rtp}
          />
        </div>
      )}

      {/* Server-side verification */}
      {(result || data) && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Server-Side Verification</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Run a high-accuracy simulation on the server (up to 10M spins)
              </p>
            </div>
            <button
              onClick={async () => {
                const config = buildConfig();
                if (!config) return;
                setServerVerifying(true);
                setServerError(null);
                try {
                  const seed = Math.floor(Math.random() * 2 ** 32);
                  const res = await api.simulation.run(config, 1_000_000, seed);
                  setServerResult(res);
                } catch (e) {
                  setServerError(e instanceof Error ? e.message : "Server verification failed");
                } finally {
                  setServerVerifying(false);
                }
              }}
              disabled={!canRun || serverVerifying}
              className="rounded-md border border-green-600 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {serverVerifying ? "Verifying..." : "Verify (1M spins)"}
            </button>
          </div>
          {serverError && (
            <p className="mt-2 text-xs text-red-600">{serverError}</p>
          )}
          {serverResult && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  step2 && Math.abs(serverResult.rtp - step2.target_rtp) < 0.5
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  Server RTP: {serverResult.rtp.toFixed(2)}%
                </span>
                <span className="text-xs text-gray-400">
                  {serverResult.spins.toLocaleString()} spins
                </span>
              </div>
              <SimulationResults result={serverResult} targetRtp={step2?.target_rtp} />
              {/* Convergence chart */}
              {serverResult.convergence && serverResult.convergence.length > 1 && (
                <ConvergenceChart
                  points={serverResult.convergence}
                  targetRtp={step2?.target_rtp}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* Navigation */}
      <div className="flex justify-between border-t border-gray-200 pt-6">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function SimulationResults({
  result,
  targetRtp,
}: {
  result: SimResult;
  targetRtp?: number;
}) {
  const rtpDiff = targetRtp ? Math.abs(result.rtp - targetRtp) : null;
  const rtpStatus =
    rtpDiff === null ? "neutral" :
    rtpDiff < 0.5 ? "good" :
    rtpDiff < 2 ? "warn" : "danger";

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="RTP"
          value={`${result.rtp.toFixed(2)}%`}
          hint={targetRtp ? `Target: ${targetRtp}%` : undefined}
          status={rtpStatus as "good" | "warn" | "danger" | "neutral"}
        />
        <MetricCard
          label="Hit Frequency"
          value={`${result.hit_frequency.toFixed(1)}%`}
        />
        <MetricCard
          label="Bonus Frequency"
          value={
            result.bonus_frequency > 0
              ? `1/${Math.round(1 / (result.bonus_frequency / 100))}`
              : "N/A"
          }
        />
        <MetricCard
          label="Max Win"
          value={`${result.max_win.toFixed(0)}x`}
        />
      </div>

      {/* Detailed stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard label="Total Spins" value={result.spins.toLocaleString()} />
        <MetricCard
          label="Total Wagered"
          value={`$${result.total_wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <MetricCard
          label="Total Won"
          value={`$${result.total_won.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <MetricCard
          label="Winning Spins"
          value={result.winning_spins.toLocaleString()}
        />
        <MetricCard
          label="Bonus Triggers"
          value={result.bonus_triggers.toLocaleString()}
        />
        <MetricCard
          label="Volatility (SD)"
          value={result.volatility_sd.toFixed(2)}
        />
      </div>

      {/* Win Distribution */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Win Distribution</h4>
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {result.distribution_buckets.map((count, i) => {
            const maxCount = Math.max(...result.distribution_buckets, 1);
            const height = (count / maxCount) * 100;
            const labels = [
              "0x", "0-1x", "1-2x", "2-5x", "5-10x", "10-20x",
              "20-50x", "50-100x", "100-200x", "200-500x",
              "500-1Kx", "1K-5Kx", "5K+x",
            ];
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{ height: `${Math.max(height, 1)}%` }}
                  title={`${labels[i]}: ${count.toLocaleString()} spins`}
                />
                <span className="text-[8px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bankroll Paths */}
      <BankrollPaths
        rtp={result.rtp}
        hitFrequency={result.hit_frequency}
        volatilitySd={result.volatility_sd}
        maxWin={result.max_win}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  status = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  status?: "good" | "warn" | "danger" | "neutral";
}) {
  const borderColor =
    status === "good" ? "border-green-200" :
    status === "warn" ? "border-amber-200" :
    status === "danger" ? "border-red-200" : "border-gray-200";

  return (
    <div className={`rounded-lg border ${borderColor} bg-white p-3`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

/** SVG-based RTP convergence chart — shows how RTP stabilizes over spins */
function ConvergenceChart({
  points,
  targetRtp,
}: {
  points: Array<{ spin: number; rtp: number }>;
  targetRtp?: number;
}) {
  const W = 600;
  const H = 160;
  const PAD = { top: 20, right: 50, bottom: 30, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxSpin = points[points.length - 1].spin;
  const allRtp = points.map((p) => p.rtp);
  const minRtp = Math.min(...allRtp, targetRtp ?? 100) - 2;
  const maxRtp = Math.max(...allRtp, targetRtp ?? 0) + 2;
  const rtpRange = maxRtp - minRtp || 1;

  const x = (spin: number) => PAD.left + (spin / maxSpin) * chartW;
  const y = (rtp: number) => PAD.top + (1 - (rtp - minRtp) / rtpRange) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.spin).toFixed(1)} ${y(p.rtp).toFixed(1)}`)
    .join(" ");

  // Y-axis tick marks (5 values)
  const yTicks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    yTicks.push(minRtp + (rtpRange * i) / 4);
  }

  return (
    <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">RTP Convergence</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={y(tick)} x2={W - PAD.right} y2={y(tick)}
              stroke="var(--border)" strokeWidth={0.5}
            />
            <text x={PAD.left - 5} y={y(tick) + 3} textAnchor="end" fontSize={9} fill="var(--text3)">
              {tick.toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Target RTP line */}
        {targetRtp !== undefined && (
          <>
            <line
              x1={PAD.left} y1={y(targetRtp)} x2={W - PAD.right} y2={y(targetRtp)}
              stroke="var(--green)" strokeWidth={1} strokeDasharray="4 3"
            />
            <text
              x={W - PAD.right + 4} y={y(targetRtp) + 3}
              fontSize={9} fill="var(--green)" fontWeight="bold"
            >
              {targetRtp}%
            </text>
          </>
        )}

        {/* RTP line */}
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth={1.5} />

        {/* Final RTP dot */}
        {points.length > 0 && (
          <circle
            cx={x(points[points.length - 1].spin)}
            cy={y(points[points.length - 1].rtp)}
            r={3} fill="var(--accent)"
          />
        )}

        {/* X-axis labels */}
        <text x={PAD.left} y={H - 5} fontSize={9} fill="var(--text3)">0</text>
        <text x={W - PAD.right} y={H - 5} fontSize={9} fill="var(--text3)" textAnchor="end">
          {maxSpin >= 1_000_000
            ? `${(maxSpin / 1_000_000).toFixed(1)}M`
            : `${(maxSpin / 1_000).toFixed(0)}K`}
        </text>
        <text x={PAD.left + chartW / 2} y={H - 5} fontSize={9} fill="var(--text3)" textAnchor="middle">
          Spins
        </text>
      </svg>
    </section>
  );
}
