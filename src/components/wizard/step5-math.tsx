"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  PaytableRow,
  RtpBudget,
  RtpVariantData,
  ReelWeights,
} from "@/lib/wizard-types";
import { api } from "@/lib/api";
import {
  calcWildChance,
  calcAvgBonusPayout,
  calcMaxWinProbability,
  formatProbability,
} from "@/lib/math-utils";
import { RtpBudgetBar } from "./rtp-budget-bar";
import { PaytableEditor } from "./paytable-editor";
import { ReelStripEditor } from "./reel-strip-editor";
import { ReelHeatmap } from "./reel-heatmap";

interface Props {
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4?: Step4Data | null;
  data?: Step5Data;
  onUpdate: (data: Step5Data) => void;
  onBack: () => void;
}

const SUB_STEPS = [
  { id: 1, label: "Targets" },
  { id: 2, label: "RTP Budget" },
  { id: 3, label: "Paytable" },
  { id: 4, label: "Reel Strips" },
  { id: 5, label: "Verify" },
];

/** Default symbol set for a slot game */
const DEFAULT_SYMBOLS = [
  { id: "wild", label: "Wild" },
  { id: "scatter", label: "Scatter" },
  { id: "hp1", label: "High Pay 1" },
  { id: "hp2", label: "High Pay 2" },
  { id: "hp3", label: "High Pay 3" },
  { id: "hp4", label: "High Pay 4" },
  { id: "lp1", label: "Low Pay 1" },
  { id: "lp2", label: "Low Pay 2" },
  { id: "lp3", label: "Low Pay 3" },
  { id: "lp4", label: "Low Pay 4" },
  { id: "lp5", label: "Low Pay 5" },
  { id: "lp6", label: "Low Pay 6" },
];

/** Generate default paytable based on volatility */
function defaultPaytable(volatility: string): PaytableRow[] {
  const isHigh = volatility.includes("high") || volatility === "extreme";
  const base = isHigh ? 1.5 : 1.0;
  return DEFAULT_SYMBOLS.map((sym, i) => {
    if (sym.id === "wild" || sym.id === "scatter") {
      return { symbol_id: sym.id, label: sym.label, x3: 0, x4: 0, x5: 0 };
    }
    const rank = i - 2; // 0 = hp1, 8 = lp6
    const mult = Math.max(0.5, 10 - rank * 1.1);
    return {
      symbol_id: sym.id,
      label: sym.label,
      x3: Math.round(mult * base * 100) / 100,
      x4: Math.round(mult * base * 5 * 100) / 100,
      x5: Math.round(mult * base * 25 * 100) / 100,
    };
  });
}

/** Generate default reel strip weights */
function defaultReelStrips(reels: number, stopsPerReel: number): Record<string, ReelWeights> {
  const strips: Record<string, ReelWeights> = {};
  for (let r = 1; r <= reels; r++) {
    const weights: ReelWeights = {
      wild: 2,
      scatter: 2,
      hp1: 2,
      hp2: 3,
      hp3: 3,
      hp4: 4,
      lp1: 5,
      lp2: 5,
      lp3: 6,
      lp4: 7,
      lp5: 8,
      lp6: 13,
    };
    // Ensure sum matches stopsPerReel
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum !== stopsPerReel) {
      weights.lp6 += stopsPerReel - sum;
    }
    strips[`reel${r}`] = weights;
  }
  return strips;
}

/** Generate initial Step5Data from Steps 1-3 */
function generateInitialData(step1: Step1Data, step2: Step2Data): Step5Data {
  const targetTenths = Math.round(step2.target_rtp * 10); // 96.0 → 960
  const stopsPerReel = 60;
  const reels = step1.grid.reels;
  const paytable = defaultPaytable(step2.volatility);
  const reelStrips = defaultReelStrips(reels, stopsPerReel);

  // Default RTP budget split (integer tenths)
  const budget: RtpBudget = {
    base_wins: Math.round(targetTenths * 0.56),
    wild_substitution: Math.round(targetTenths * 0.085),
    free_spins: Math.round(targetTenths * 0.10),
    accumulator: 0, // derived
  };
  // Derive last segment for exact total
  budget.accumulator = targetTenths - budget.base_wins - budget.wild_substitution - budget.free_spins;

  const primaryVariant: RtpVariantData = {
    paytable,
    reel_strips: reelStrips,
    stops_per_reel: stopsPerReel,
    analytical_rtp: step2.target_rtp,
  };

  const variants: Record<string, RtpVariantData> = {
    [step2.target_rtp.toFixed(1)]: primaryVariant,
  };

  // Add additional RTP variants from Step 2
  if (step2.rtp_variants?.length) {
    for (const v of step2.rtp_variants) {
      if (v !== step2.target_rtp) {
        variants[v.toFixed(1)] = {
          paytable: [...paytable.map((r) => ({ ...r }))],
          reel_strips: defaultReelStrips(reels, stopsPerReel),
          stops_per_reel: stopsPerReel,
          analytical_rtp: v,
        };
      }
    }
  }

  return {
    active_variant: step2.target_rtp.toFixed(1),
    rtp_variants: variants,
    rtp_budget: budget,
    target_rtp_tenths: targetTenths,
  };
}

export function Step5Math({ step1, step2, step3, step4, data, onUpdate, onBack }: Props) {
  const [subStep, setSubStep] = useState(1);
  const [localData, setLocalData] = useState<Step5Data | null>(data ?? null);
  const [generated, setGenerated] = useState(!!data);
  const [generating, setGenerating] = useState(false);

  const reels = step1?.grid.reels ?? 5;
  const symbolLabels = useMemo(() => {
    // Use Step 4 symbols if available, otherwise defaults
    if (step4?.symbols?.length) {
      const map: Record<string, string> = {};
      for (const sym of step4.symbols) {
        map[sym.id] = sym.name;
      }
      return map;
    }
    const map: Record<string, string> = {};
    for (const sym of DEFAULT_SYMBOLS) {
      map[sym.id] = sym.label;
    }
    return map;
  }, [step4]);

  const handleGenerate = useCallback(async () => {
    if (!step1 || !step2) return;
    setGenerating(true);

    // Build symbols from Step 4 if available, otherwise use defaults
    const symbols = step4?.symbols?.length
      ? step4.symbols.map(s => ({ id: s.id, name: s.name, role: s.role }))
      : [
          ...DEFAULT_SYMBOLS.filter(s => s.id !== "wild" && s.id !== "scatter")
            .map((s, i) => ({
              id: s.id,
              name: s.label,
              role: (i < 4 ? "high_pay" : "low_pay") as string,
            })),
          { id: "wild", name: "Wild", role: "wild" },
          { id: "scatter", name: "Scatter", role: "scatter" },
        ];

    // Extract feature variants from Step 3
    const features = step3?.features?.map(f => f.variant) ?? [];

    try {
      const result = await api.math.generate({
        grid: step1.grid,
        target_rtp: step2.target_rtp,
        volatility: step2.volatility,
        paylines: step1.paylines,
        features,
        symbols,
        rtp_variants: step2.rtp_variants,
      });

      setLocalData(result);
      setGenerated(true);
      setSubStep(2);
    } catch {
      // Fallback to local generation if backend unavailable
      const initial = generateInitialData(step1, step2);
      setLocalData(initial);
      setGenerated(true);
      setSubStep(2);
    } finally {
      setGenerating(false);
    }
  }, [step1, step2, step3, step4]);

  const activeVariant = localData
    ? localData.rtp_variants[localData.active_variant]
    : null;

  const variantKeys = localData ? Object.keys(localData.rtp_variants).sort((a, b) => parseFloat(b) - parseFloat(a)) : [];

  const switchVariant = useCallback(
    (key: string) => {
      if (!localData) return;
      setLocalData({ ...localData, active_variant: key });
    },
    [localData]
  );

  const updateBudget = useCallback(
    (budget: RtpBudget) => {
      if (!localData) return;
      setLocalData({ ...localData, rtp_budget: budget });
    },
    [localData]
  );

  const updatePaytable = useCallback(
    (rows: PaytableRow[]) => {
      if (!localData || !activeVariant) return;
      setLocalData({
        ...localData,
        rtp_variants: {
          ...localData.rtp_variants,
          [localData.active_variant]: { ...activeVariant, paytable: rows },
        },
      });
    },
    [localData, activeVariant]
  );

  const updateReelStrips = useCallback(
    (strips: Record<string, ReelWeights>) => {
      if (!localData || !activeVariant) return;
      setLocalData({
        ...localData,
        rtp_variants: {
          ...localData.rtp_variants,
          [localData.active_variant]: { ...activeVariant, reel_strips: strips },
        },
      });
    },
    [localData, activeVariant]
  );

  const handleSave = useCallback(() => {
    if (localData) onUpdate(localData);
  }, [localData, onUpdate]);

  // Validation summary for sub-step 5
  const validationSummary = useMemo(() => {
    if (!localData || !activeVariant) return [];
    const checks: { label: string; status: "pass" | "warn" | "fail" }[] = [];

    // Check reel totals
    const reelKeys = Object.keys(activeVariant.reel_strips);
    let allReelsValid = true;
    for (const rk of reelKeys) {
      const sum = Object.values(activeVariant.reel_strips[rk]).reduce((a, b) => a + b, 0);
      if (sum !== activeVariant.stops_per_reel) allReelsValid = false;
    }
    checks.push({ label: `Reel totals (${activeVariant.stops_per_reel} stops each)`, status: allReelsValid ? "pass" : "fail" });

    // Budget total
    const budgetTotal =
      localData.rtp_budget.base_wins +
      localData.rtp_budget.wild_substitution +
      localData.rtp_budget.free_spins +
      localData.rtp_budget.accumulator;
    checks.push({
      label: `RTP budget total: ${(budgetTotal / 10).toFixed(1)}%`,
      status: budgetTotal === localData.target_rtp_tenths ? "pass" : "fail",
    });

    // Paytable has payouts
    const hasPayouts = activeVariant.paytable.some((r) => r.x3 > 0 || r.x5 > 0);
    checks.push({ label: "Paytable has non-zero payouts", status: hasPayouts ? "pass" : "fail" });

    // Multi-RTP variants count
    checks.push({
      label: `${variantKeys.length} RTP variant(s) configured`,
      status: variantKeys.length >= 1 ? "pass" : "warn",
    });

    return checks;
  }, [localData, activeVariant, variantKeys]);

  if (!step1 || !step2) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-dashed border-orange-300 bg-orange-50 p-8 text-center">
        <p className="text-sm font-medium text-orange-800">
          Complete Steps 1 and 2 before configuring the math model.
        </p>
        <button
          onClick={onBack}
          className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Sub-step nav */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        {SUB_STEPS.map((ss) => (
          <button
            key={ss.id}
            onClick={() => generated && setSubStep(ss.id)}
            disabled={!generated && ss.id > 1}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subStep === ss.id
                ? "bg-white text-gray-900 shadow-sm"
                : generated
                  ? "text-gray-600 hover:text-gray-900"
                  : "text-gray-400 cursor-not-allowed"
            }`}
          >
            5.{ss.id} {ss.label}
          </button>
        ))}
      </div>

      {/* Variant tabs (show when generated and on sub-steps 3-5) */}
      {generated && localData && variantKeys.length > 1 && subStep >= 3 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">RTP Variant:</span>
          {variantKeys.map((vk) => (
            <button
              key={vk}
              onClick={() => switchVariant(vk)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                localData.active_variant === vk
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {vk}%
            </button>
          ))}
        </div>
      )}

      {/* Sub-step 1: Targets Lock */}
      {subStep === 1 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900">Targets from Steps 1-2</h3>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Game Type</span>
                <p className="font-medium text-gray-800">{step1.game_type} — {step1.variant}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Grid</span>
                <p className="font-medium text-gray-800">{step1.grid.reels}×{step1.grid.rows}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Target RTP</span>
                <p className="font-medium text-gray-800">{step2.target_rtp}%</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Volatility</span>
                <p className="font-medium text-gray-800 capitalize">{step2.volatility.replace("_", " ")}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Hit Frequency</span>
                <p className="font-medium text-gray-800">{step2.hit_frequency}%</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Max Win</span>
                <p className="font-medium text-gray-800">{step2.max_win}x</p>
              </div>
            </div>
            {step2.rtp_variants?.length > 0 && (
              <div className="mt-4 rounded-md bg-gray-50 p-3">
                <span className="text-xs text-gray-500">RTP Variants</span>
                <p className="font-medium text-gray-800">
                  {[step2.target_rtp, ...step2.rtp_variants.filter((v) => v !== step2.target_rtp)]
                    .map((v) => `${v}%`)
                    .join(", ")}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Math Model"}
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 2: RTP Budget */}
      {subStep === 2 && localData && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <RtpBudgetBar
              budget={localData.rtp_budget}
              targetTenths={localData.target_rtp_tenths}
              onChange={updateBudget}
            />
          </div>

          {/* Player feel cards */}
          <div className="grid grid-cols-3 gap-3">
            {(() => {
              const wildChance = activeVariant
                ? calcWildChance(activeVariant.reel_strips, activeVariant.stops_per_reel)
                : 0;
              const avgBonusPayout = calcAvgBonusPayout(
                localData.rtp_budget.free_spins,
                step2.bonus_frequency
              );
              const maxWinProb = activeVariant
                ? calcMaxWinProbability(
                    activeVariant.paytable,
                    activeVariant.reel_strips,
                    activeVariant.stops_per_reel,
                    step1.paylines,
                    reels
                  )
                : 0;

              return [
                {
                  label: "Spins Until Win",
                  value: step2.hit_frequency > 0 ? `~${Math.round(100 / step2.hit_frequency)}` : "—",
                },
                {
                  label: "Avg Base Win",
                  value: step2.hit_frequency > 0
                    ? `${((localData.rtp_budget.base_wins / 10) / (step2.hit_frequency / 100)).toFixed(1)}x`
                    : "—",
                },
                {
                  label: "Time Between Bonuses",
                  value: step2.bonus_frequency > 0 ? `1 in ${step2.bonus_frequency}` : "—",
                },
                {
                  label: "Wild Chance",
                  value: wildChance > 0 ? `${(wildChance * 100).toFixed(1)}%` : "—",
                },
                {
                  label: "Avg Bonus Payout",
                  value: avgBonusPayout > 0 ? `${avgBonusPayout.toFixed(1)}x` : "—",
                },
                {
                  label: "Max Win Probability",
                  value: formatProbability(maxWinProb),
                },
              ].map((card) => (
                <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
                </div>
              ));
            })()}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setSubStep(3)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next: Paytable
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 3: Paytable */}
      {subStep === 3 && activeVariant && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <PaytableEditor
              rows={activeVariant.paytable}
              onChange={updatePaytable}
              reels={reels}
              reelStrips={activeVariant.reel_strips}
              stopsPerReel={activeVariant.stops_per_reel}
              paylines={step1.paylines}
            />
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setSubStep(2)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setSubStep(4)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next: Reel Strips
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 4: Reel Strips */}
      {subStep === 4 && activeVariant && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <ReelStripEditor
              reelStrips={activeVariant.reel_strips}
              stopsPerReel={activeVariant.stops_per_reel}
              symbolLabels={symbolLabels}
              onChange={updateReelStrips}
            />

            {/* Reel strip heatmap */}
            <ReelHeatmap
              reelStrips={activeVariant.reel_strips}
              stopsPerReel={activeVariant.stops_per_reel}
              symbolRoles={step4?.symbols?.length
                ? Object.fromEntries(step4.symbols.map(s => [s.id, s.role]))
                : undefined
              }
            />
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setSubStep(3)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setSubStep(5)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next: Verify
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 5: Verify & Save */}
      {subStep === 5 && localData && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h4 className="text-sm font-semibold text-gray-900">Verification</h4>
            <div className="mt-4 space-y-2">
              {validationSummary.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center gap-3 rounded-md bg-gray-50 px-4 py-2.5"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                      check.status === "pass"
                        ? "bg-green-500"
                        : check.status === "warn"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  >
                    {check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✕"}
                  </span>
                  <span className="text-sm text-gray-700">{check.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={onBack}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Step 4
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save & Continue to Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
