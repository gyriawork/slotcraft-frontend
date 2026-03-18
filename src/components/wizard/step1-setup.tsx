"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Hint } from "./hint";
import type {
  GameType,
  SlotVariant,
  WinMechanic,
  Market,
  Step1Data,
  GridConfig,
  BetConfig,
} from "@/lib/wizard-types";

const GAME_TYPES: { value: GameType; label: string; description: string }[] = [
  { value: "slot", label: "Slot", description: "Video slots, classic slots, megaways" },
  { value: "crash", label: "Crash", description: "Crash games like Aviator" },
  { value: "table", label: "Table", description: "Roulette, blackjack, baccarat" },
];

const SLOT_VARIANTS: { value: SlotVariant; label: string }[] = [
  { value: "video_slot", label: "Video Slot" },
  { value: "classic", label: "Classic" },
  { value: "megaways", label: "Megaways" },
  { value: "cluster", label: "Cluster Pays" },
  { value: "hold_spin", label: "Hold & Spin" },
];

const WIN_MECHANICS: { value: WinMechanic; label: string }[] = [
  { value: "fixed_paylines", label: "Fixed Paylines" },
  { value: "adjustable_paylines", label: "Adjustable Paylines" },
  { value: "all_ways", label: "All Ways (243+)" },
  { value: "cluster", label: "Cluster" },
];

const MARKETS: { value: Market; label: string }[] = [
  { value: "mga", label: "EU (MGA)" },
  { value: "ukgc", label: "UK (UKGC)" },
  { value: "ggl", label: "Germany (GGL)" },
  { value: "latam", label: "LatAm" },
  { value: "asia", label: "Asia" },
  { value: "curacao", label: "Curaçao" },
  { value: "ontario", label: "Ontario" },
  { value: "sweden", label: "Sweden" },
];

const MARKET_WARNINGS: Record<Market, string[]> = {
  mga: [],
  ukgc: ["Max bet capped at £5", "No bonus buy feature", "No autoplay", "Min 2.5s spin time"],
  ggl: ["Max bet capped at €1", "No bonus buy feature", "No jackpots", "No autoplay", "Min 5s spin time"],
  latam: [],
  asia: [],
  curacao: [],
  ontario: ["No bonus buy feature"],
  sweden: ["No bonus buy feature", "Min 3s spin time"],
};

const REEL_OPTIONS = [3, 5, 6];
const ROW_OPTIONS = [3, 4, 5];

export interface ProjectDates {
  development_start: string;
  development_end: string;
  tech_release: string;
  pre_release: string;
  marketing_release: string;
}

interface Step1SetupProps {
  data?: Partial<Step1Data>;
  onUpdate: (data: Step1Data) => void;
  projectId?: string;
  projectDates?: Partial<ProjectDates>;
}

export function Step1Setup({ data, onUpdate, projectId, projectDates }: Step1SetupProps) {
  const [gameType, setGameType] = useState<GameType>(data?.game_type ?? "slot");
  const [variant, setVariant] = useState<string>(data?.variant ?? "video_slot");
  const [grid, setGrid] = useState<GridConfig>(data?.grid ?? { reels: 5, rows: 3 });
  const [winMechanic, setWinMechanic] = useState<WinMechanic>(
    data?.win_mechanic ?? "fixed_paylines"
  );
  const [paylines, setPaylines] = useState(data?.paylines ?? 20);
  const [bet, setBet] = useState<BetConfig>(
    data?.bet ?? { min: 0.2, max: 100, default: 1 }
  );
  const [markets, setMarkets] = useState<Market[]>(data?.markets ?? []);
  const [dates, setDates] = useState<ProjectDates>({
    development_start: projectDates?.development_start ?? "",
    development_end: projectDates?.development_end ?? "",
    tech_release: projectDates?.tech_release ?? "",
    pre_release: projectDates?.pre_release ?? "",
    marketing_release: projectDates?.marketing_release ?? "",
  });

  function handleGameTypeChange(type: GameType) {
    setGameType(type);
    if (type === "slot") setVariant("video_slot");
  }

  function toggleMarket(market: Market) {
    setMarkets((prev) =>
      prev.includes(market) ? prev.filter((m) => m !== market) : [...prev, market]
    );
  }

  function getPaylineHint() {
    if (paylines < 5) return { level: "warn" as const, text: "Very few paylines — high volatility" };
    if (paylines <= 15) return { level: "neutral" as const, text: "Balanced payline count" };
    if (paylines <= 25) return { level: "good" as const, text: "Standard payline count" };
    if (paylines <= 40) return { level: "neutral" as const, text: "Frequent wins — lower volatility" };
    return { level: "warn" as const, text: "Consider using All Ways mechanic instead" };
  }

  function handleSave() {
    const constraints: Record<string, { autoplay_disabled?: boolean; bonus_buy_disabled?: boolean; max_bet_cap?: number; min_spin_time_ms?: number }> = {};
    for (const m of markets) {
      if (m === "ukgc") {
        constraints[m] = { autoplay_disabled: true, bonus_buy_disabled: true, max_bet_cap: 5, min_spin_time_ms: 2500 };
      } else if (m === "ggl") {
        constraints[m] = { autoplay_disabled: true, bonus_buy_disabled: true, max_bet_cap: 1, min_spin_time_ms: 5000 };
      } else if (m === "ontario") {
        constraints[m] = { bonus_buy_disabled: true };
      } else if (m === "sweden") {
        constraints[m] = { bonus_buy_disabled: true, min_spin_time_ms: 3000 };
      }
    }

    onUpdate({
      game_type: gameType,
      variant,
      grid,
      win_mechanic: winMechanic,
      paylines: winMechanic === "cluster" || winMechanic === "all_ways" ? 0 : paylines,
      bet,
      markets,
      market_constraints: constraints,
    });

    if (projectId) {
      api.projects.update(projectId, {
        development_start: dates.development_start || null,
        development_end: dates.development_end || null,
        tech_release: dates.tech_release || null,
        pre_release: dates.pre_release || null,
        marketing_release: dates.marketing_release || null,
      }).catch(() => { /* silently fail — dates are secondary */ });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Game Type */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Game Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {GAME_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleGameTypeChange(type.value)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                gameType === type.value
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{type.label}</div>
              <div className="mt-1 text-xs text-gray-500">{type.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Slot-specific fields */}
      {gameType === "slot" && (
        <>
          {/* Variant */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Slot Variant</h3>
            <div className="flex flex-wrap gap-2">
              {SLOT_VARIANTS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => {
                    setVariant(v.value);
                    if (v.value === "megaways") {
                      setGrid({ reels: 6, rows: 7 });
                      setWinMechanic("all_ways");
                    }
                    if (v.value === "cluster") {
                      setWinMechanic("cluster");
                    }
                  }}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    variant === v.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </section>

          {/* Grid */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Grid Size</h3>
            <div className="flex gap-8">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Reels</label>
                <div className="flex gap-2">
                  {REEL_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setGrid((g) => ({ ...g, reels: r }))}
                      className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                        grid.reels === r
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Rows</label>
                <div className="flex gap-2">
                  {ROW_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setGrid((g) => ({ ...g, rows: r }))}
                      className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                        grid.rows === r
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <span className="rounded-md bg-gray-100 px-3 py-2 text-sm font-mono text-gray-600">
                  {grid.reels} × {grid.rows}
                </span>
              </div>
            </div>

            {/* Grid Preview */}
            <div className="mt-3 flex justify-center">
              <div
                className="inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${grid.reels}, 1fr)` }}
              >
                {Array.from({ length: grid.rows * grid.reels }, (_, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded"
                    style={{
                      background: "var(--bg4, #e5e7eb)",
                      border: "1px solid var(--border, #d1d5db)",
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Win Mechanic */}
          {variant !== "cluster" && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Win Mechanic</h3>
              <div className="flex flex-wrap gap-2">
                {WIN_MECHANICS.filter((m) => variant !== "megaways" || m.value === "all_ways").map(
                  (m) => (
                    <button
                      key={m.value}
                      onClick={() => setWinMechanic(m.value)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        winMechanic === m.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                )}
              </div>
            </section>
          )}

          {/* Paylines */}
          {(winMechanic === "fixed_paylines" || winMechanic === "adjustable_paylines") && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Paylines: <span className="font-mono">{paylines}</span>
              </h3>
              <input
                type="range"
                min={1}
                max={50}
                value={paylines}
                onChange={(e) => setPaylines(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span>
                <span>25</span>
                <span>50</span>
              </div>
              {(() => {
                const hint = getPaylineHint();
                return <Hint level={hint.level}>{hint.text}</Hint>;
              })()}
            </section>
          )}

          {/* Bet Range */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Bet Range</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Bet</label>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={5}
                  value={bet.min}
                  onChange={(e) =>
                    setBet((b) => ({ ...b, min: Number(e.target.value) }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Bet</label>
                <input
                  type="number"
                  step={10}
                  min={10}
                  max={500}
                  value={bet.max}
                  onChange={(e) =>
                    setBet((b) => ({ ...b, max: Number(e.target.value) }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default Bet</label>
                <input
                  type="number"
                  step={0.1}
                  min={bet.min}
                  max={bet.max}
                  value={bet.default}
                  onChange={(e) =>
                    setBet((b) => ({ ...b, default: Number(e.target.value) }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Crash / Table placeholders */}
      {gameType === "crash" && (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Crash game configuration coming in Phase 2</p>
        </section>
      )}
      {gameType === "table" && (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Table game configuration coming in Phase 2</p>
        </section>
      )}

      {/* Target Markets */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Target Markets</h3>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.value}
              onClick={() => toggleMarket(m.value)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                markets.includes(m.value)
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Market constraint warnings */}
        {markets.map((m) => {
          const warnings = MARKET_WARNINGS[m];
          if (!warnings?.length) return null;
          return (
            <div key={m} className="mt-2">
              {warnings.map((w) => (
                <Hint key={w} level="warn">{MARKETS.find((mk) => mk.value === m)?.label}: {w}</Hint>
              ))}
            </div>
          );
        })}
      </section>

      {/* Project Timeline */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Timeline</h3>
        <div className="grid grid-cols-2 gap-4">
          {([
            ["development_start", "Development start"],
            ["development_end", "Development end"],
            ["tech_release", "Tech release"],
            ["pre_release", "Pre-release"],
            ["marketing_release", "Marketing release"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type="date"
                value={dates[key]}
                onChange={(e) => setDates((d) => ({ ...d, [key]: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                style={{ colorScheme: "dark" }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Save / Continue */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
