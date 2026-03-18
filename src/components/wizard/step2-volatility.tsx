"use client";

import { useState, useMemo } from "react";
import { Hint } from "./hint";
import type { Step2Data, Volatility } from "@/lib/wizard-types";

const VOLATILITY_LEVELS: {
  value: Volatility;
  label: string;
  description: string;
}[] = [
  { value: "low", label: "Low", description: "Frequent small wins, steady bankroll" },
  { value: "med_low", label: "Med-Low", description: "Slightly more variance, low risk" },
  { value: "med", label: "Medium", description: "Balanced, broad audience" },
  { value: "med_high", label: "Med-High", description: "Industry favorite, rewarding bonuses" },
  { value: "high", label: "High", description: "Long dry spells, explosive wins" },
  { value: "extreme", label: "Extreme", description: "Very rare wins, massive potential" },
];

const RTP_PRESETS = [88, 92, 94, 96, 96.5, 97];
const MAX_WIN_PRESETS = [500, 2000, 5000, 10000, 20000];

interface Step2Props {
  data?: Partial<Step2Data>;
  onUpdate: (data: Step2Data) => void;
  onBack: () => void;
}

function getRtpHint(rtp: number) {
  if (rtp < 90) return { level: "danger" as const, text: "Very low — unregulated markets only" };
  if (rtp < 93) return { level: "warn" as const, text: "Below standard — LatAm/Asia specific" };
  if (rtp < 95) return { level: "neutral" as const, text: "Mid-range, mobile casual" };
  if (rtp <= 96.5) return { level: "good" as const, text: "Industry sweet spot, EU standard" };
  if (rtp <= 97.5) return { level: "neutral" as const, text: "Player-friendly, lower margin" };
  return { level: "warn" as const, text: "Extremely thin margin — rare in production" };
}

function getHitFreqHint(freq: number) {
  if (freq < 20) return { level: "warn" as const, text: "Only viable with very high max wins" };
  if (freq < 25) return { level: "neutral" as const, text: "High volatility pair" };
  if (freq <= 30) return { level: "good" as const, text: "Sweet spot — most common" };
  if (freq <= 35) return { level: "neutral" as const, text: "Above average, frequent wins" };
  if (freq <= 40) return { level: "neutral" as const, text: "Low volatility feel" };
  return { level: "warn" as const, text: "Constant action, tiny wins — consider lowering" };
}

function getMaxWinHint(maxWin: number) {
  if (maxWin <= 500) return { level: "neutral" as const, text: "Conservative cap" };
  if (maxWin <= 2000) return { level: "neutral" as const, text: "Standard range" };
  if (maxWin <= 5000) return { level: "good" as const, text: "Popular range (Sweet Bonanza territory)" };
  if (maxWin <= 10000) return { level: "neutral" as const, text: "High potential — requires careful math" };
  return { level: "warn" as const, text: "Extreme — requires 100M+ spin simulation" };
}

function getBonusFreqHint(freq: number) {
  if (freq <= 60) return { level: "neutral" as const, text: "Very frequent — casual-friendly" };
  if (freq <= 100) return { level: "good" as const, text: "Frequent — good for medium volatility" };
  if (freq <= 150) return { level: "good" as const, text: "Standard — industry norm" };
  if (freq <= 200) return { level: "neutral" as const, text: "Infrequent (5-8 min between triggers)" };
  return { level: "warn" as const, text: "Rare (12-20 min) — extreme volatility only" };
}

export function Step2Volatility({ data, onUpdate, onBack }: Step2Props) {
  const [rtp, setRtp] = useState(data?.target_rtp ?? 96);
  const [volatility, setVolatility] = useState<Volatility>(data?.volatility ?? "med_high");
  const [hitFreq, setHitFreq] = useState(data?.hit_frequency ?? 28);
  const [maxWin, setMaxWin] = useState(data?.max_win ?? 5000);
  const [bonusFreq, setBonusFreq] = useState(data?.bonus_frequency ?? 120);

  // Conflict detection
  const conflicts = useMemo(() => {
    const list: string[] = [];
    if ((volatility === "high" || volatility === "extreme") && hitFreq > 30) {
      list.push("High volatility + high hit frequency (>30%) is contradictory");
    }
    if ((volatility === "low" || volatility === "med_low") && maxWin > 5000) {
      list.push("Low volatility + high max win (>5,000x) is mathematically difficult");
    }
    if (rtp < 92 && maxWin > 10000) {
      list.push("Low RTP (<92%) + high max win (>10,000x) — certification risk");
    }
    if (rtp > 96.5 && maxWin > 5000 && bonusFreq < 100) {
      list.push("High RTP + high max win + frequent bonuses — engine may not converge");
    }
    if ((volatility === "low" || volatility === "med_low") && hitFreq < 25) {
      list.push("Low volatility + low hit frequency (<25%) is inconsistent");
    }
    return list;
  }, [volatility, hitFreq, maxWin, rtp, bonusFreq]);

  function handleSave() {
    onUpdate({
      target_rtp: rtp,
      volatility,
      hit_frequency: hitFreq,
      max_win: maxWin,
      bonus_frequency: bonusFreq,
      rtp_variants: [rtp, Math.max(88, rtp - 2), Math.max(88, rtp - 4)],
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Target RTP */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Target RTP: <span className="font-mono">{rtp.toFixed(1)}%</span>
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {RTP_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setRtp(preset)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                rtp === preset
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
        <input
          type="range"
          min={88}
          max={98}
          step={0.1}
          value={rtp}
          onChange={(e) => setRtp(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>88%</span>
          <span>93%</span>
          <span>98%</span>
        </div>
        {(() => {
          const hint = getRtpHint(rtp);
          return <Hint level={hint.level}>{hint.text}</Hint>;
        })()}
      </section>

      {/* Volatility */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Volatility</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {VOLATILITY_LEVELS.map((v) => (
            <button
              key={v.value}
              onClick={() => setVolatility(v.value)}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                volatility === v.value
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-xs font-medium text-gray-900">{v.label}</div>
              <div className="mt-0.5 text-[10px] text-gray-500 leading-tight">{v.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Hit Frequency */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Hit Frequency: <span className="font-mono">{hitFreq}%</span>
        </h3>
        <input
          type="range"
          min={15}
          max={45}
          step={1}
          value={hitFreq}
          onChange={(e) => setHitFreq(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>15%</span>
          <span>30%</span>
          <span>45%</span>
        </div>
        {(() => {
          const hint = getHitFreqHint(hitFreq);
          return <Hint level={hint.level}>{hint.text}</Hint>;
        })()}
      </section>

      {/* Max Win */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Max Win: <span className="font-mono">{maxWin.toLocaleString()}x</span>
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {MAX_WIN_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setMaxWin(preset)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                maxWin === preset
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {preset.toLocaleString()}x
            </button>
          ))}
        </div>
        <input
          type="range"
          min={500}
          max={20000}
          step={100}
          value={maxWin}
          onChange={(e) => setMaxWin(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        {(() => {
          const hint = getMaxWinHint(maxWin);
          return <Hint level={hint.level}>{hint.text}</Hint>;
        })()}
      </section>

      {/* Bonus Frequency */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Bonus Frequency: <span className="font-mono">1/{bonusFreq}</span> spins
        </h3>
        <input
          type="range"
          min={40}
          max={300}
          step={10}
          value={bonusFreq}
          onChange={(e) => setBonusFreq(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1/40</span>
          <span>1/150</span>
          <span>1/300</span>
        </div>
        {(() => {
          const hint = getBonusFreqHint(bonusFreq);
          return <Hint level={hint.level}>{hint.text}</Hint>;
        })()}
      </section>

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-red-700 mb-2">Configuration Conflicts</h3>
          {conflicts.map((c) => (
            <Hint key={c} level="danger">{c}</Hint>
          ))}
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
