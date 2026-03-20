"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step5Data,
  Step7Data,
  SpeedMode,
  VisualMode,
  UiSkin,
} from "@/lib/wizard-types";
import { spinOnce, type SimulationConfig, type RustSymbol } from "@/lib/simulation";
import { SlotRenderer, type SlotRendererHandle } from "@/components/slot-renderer";

interface Props {
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step5: Step5Data | null;
  data?: Step7Data;
  onUpdate: (data: Step7Data) => void;
  onBack: () => void;
}

const SYMBOL_EMOJI: Record<string, string> = {
  wild: "🌟", scatter: "⚡", hp1: "💎", hp2: "👑", hp3: "🏺", hp4: "🗿",
  lp1: "🅰️", lp2: "🅺", lp3: "🆀", lp4: "🅹", lp5: "🔟", lp6: "9️⃣",
};

const SYMBOL_ID_TO_RUST: Record<string, RustSymbol> = {
  wild: "Wild", scatter: "Scatter",
  hp1: { Regular: 0 }, hp2: { Regular: 1 }, hp3: { Regular: 2 }, hp4: { Regular: 3 },
  lp1: { Regular: 4 }, lp2: { Regular: 5 }, lp3: { Regular: 6 }, lp4: { Regular: 7 },
  lp5: { Regular: 8 }, lp6: { Regular: 9 },
};

interface SpinLog {
  spin: number;
  grid: string[][];
  win: number;
  cascades: number;
  isBonus: boolean;
}

const SPEED_DELAYS: Record<SpeedMode, number> = { normal: 600, turbo: 150, instant: 0 };

function defaultStep7(): Step7Data {
  return {
    visual_mode: "emoji",
    ui_skin: "dark",
    feature_toggles: {
      sound: false, win_animations: true, accumulator_ui: true,
      autoplay: false, paytable_visible: false, rtp_debug: false,
    },
    demo_balance: 1000,
    view_type: "designer",
    speed: "normal",
  };
}

function buildWasmConfig(
  step1: Step1Data,
  step3: Step3Data | null,
  variant: { paytable: Array<{ symbol_id: string; x3: number; x4: number; x5: number }>; reel_strips: Record<string, Record<string, number>> },
  betSize: number
): SimulationConfig {
  const reels = step1.grid.reels;
  const rows = step1.grid.rows;

  const reel_strips = [];
  for (let r = 1; r <= reels; r++) {
    const weights = variant.reel_strips[`reel${r}`];
    if (!weights) continue;
    const rustWeights: Array<[RustSymbol, number]> = [];
    for (const [symId, weight] of Object.entries(weights)) {
      const rustSym = SYMBOL_ID_TO_RUST[symId];
      if (rustSym && weight > 0) rustWeights.push([rustSym, weight]);
    }
    reel_strips.push({ weights: rustWeights });
  }

  const paytable: SimulationConfig["paytable"] = [];
  for (const row of variant.paytable) {
    const rustSym = SYMBOL_ID_TO_RUST[row.symbol_id];
    if (!rustSym) continue;
    if (row.x3 > 0) paytable.push({ symbol: rustSym, count: 3, payout: row.x3 });
    if (row.x4 > 0) paytable.push({ symbol: rustSym, count: 4, payout: row.x4 });
    if (row.x5 > 0) paytable.push({ symbol: rustSym, count: 5, payout: row.x5 });
  }

  const paylines: number[][] = [];
  if (rows === 1) {
    paylines.push(Array(reels).fill(0));
  } else {
    for (let row = 0; row < rows; row++) paylines.push(Array(reels).fill(row));
    if (rows >= 3 && reels >= 3) {
      paylines.push([0, 1, 2, 1, 0].slice(0, reels));
      paylines.push([2, 1, 0, 1, 2].slice(0, reels));
      if (reels >= 5) {
        paylines.push([0, 0, 1, 0, 0]);
        paylines.push([2, 2, 1, 2, 2]);
        paylines.push([1, 0, 0, 0, 1]);
        paylines.push([1, 2, 2, 2, 1]);
        paylines.push([0, 1, 0, 1, 0]);
      }
    }
  }

  const features = step3?.features ?? [];
  const cascadeEnabled = features.some((f) => f.variant === "accumulator");
  const freeSpinsEnabled = features.some((f) => f.variant === "free_spins");
  const wildFeature = features.find((f) => f.type === "wild");

  let wildType: SimulationConfig["features"]["wild_config"]["wild_type"] = "Standard";
  if (wildFeature) {
    switch (wildFeature.variant) {
      case "expanding": wildType = "Expanding"; break;
      case "sticky": wildType = "Sticky"; break;
      case "walking": wildType = "Walking"; break;
      case "stacked": wildType = { Stacked: (wildFeature.config?.stack_height as number) || 3 }; break;
      case "multiplier": wildType = { Multiplier: (wildFeature.config?.multiplier as number) || 2 }; break;
    }
  }

  return {
    reels, rows, reel_strips, paytable, paylines,
    features: {
      cascade_enabled: cascadeEnabled,
      accumulator_tiers: [],
      free_spins_enabled: freeSpinsEnabled,
      free_spin_awards: freeSpinsEnabled ? { "3": 10, "4": 15, "5": 25 } : {},
      retrigger_spins: freeSpinsEnabled ? 5 : 0,
      max_total_free_spins: freeSpinsEnabled ? 50 : 0,
      wild_config: { wild_type: wildType },
    },
    bet: betSize,
  };
}

export function Step7Prototype({ step1, step2, step3, step5, data, onUpdate, onBack }: Props) {
  const [config, setConfig] = useState<Step7Data>(data ?? defaultStep7());
  const [balance, setBalance] = useState(
    typeof config.demo_balance === "number" ? config.demo_balance : 99999
  );
  const [betSize] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [lastBonus, setLastBonus] = useState(false);
  const [lastCascades, setLastCascades] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [totalBet, setTotalBet] = useState(0);
  const [spinLog, setSpinLog] = useState<SpinLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(!data);
  const autoplayRef = useRef(false);
  const seedRef = useRef(Math.floor(Math.random() * 1_000_000));
  const rendererRef = useRef<SlotRendererHandle>(null);

  const variant = step5?.rtp_variants[step5.active_variant];

  const wasmConfig = useMemo(() => {
    if (!step1 || !variant) return null;
    return buildWasmConfig(step1, step3, variant, betSize);
  }, [step1, step3, variant, betSize]);

  const paytableLookup = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    if (variant?.paytable) {
      for (const row of variant.paytable) map[row.symbol_id] = { x3: row.x3, x4: row.x4, x5: row.x5 };
    }
    return map;
  }, [variant]);

  const reels = step1?.grid.reels ?? 5;
  const rows = step1?.grid.rows ?? 3;

  const spin = useCallback(async () => {
    if (spinning || !wasmConfig) return;
    if (config.demo_balance !== "unlimited" && balance < betSize) return;

    setSpinning(true);
    setWasmError(null);

    if (config.demo_balance !== "unlimited") setBalance((b) => b - betSize);
    setTotalBet((t) => t + betSize);
    setTotalSpins((s) => s + 1);

    rendererRef.current?.animateSpinStart();
    if (SPEED_DELAYS[config.speed] > 0) {
      await new Promise((r) => setTimeout(r, SPEED_DELAYS[config.speed]));
    }

    try {
      const seed = seedRef.current++;
      const result = await spinOnce(wasmConfig, seed);
      await rendererRef.current?.animateSpinStop(result.grid);

      setGrid(result.grid);
      setLastWin(result.total_win);
      setLastBonus(result.bonus_triggered);
      setLastCascades(result.cascade_count);
      setTotalWon((t) => t + result.total_win);
      if (config.demo_balance !== "unlimited") setBalance((b) => b + result.total_win);

      if (result.total_win > 0 && config.feature_toggles.win_animations) rendererRef.current?.animateWin(result.total_win);
      if (result.cascade_count > 0) rendererRef.current?.animateCascade();

      const spinNum = totalSpins + 1;
      setSpinLog((log) => [
        { spin: spinNum, grid: result.grid, win: result.total_win, cascades: result.cascade_count, isBonus: result.bonus_triggered },
        ...log.slice(0, 99),
      ]);
    } catch (err) {
      setWasmError(err instanceof Error ? err.message : "WASM spin failed");
    }

    setSpinning(false);
  }, [spinning, wasmConfig, balance, betSize, config, totalSpins]);

  useEffect(() => {
    if (!autoplayRef.current || spinning) return;
    const timer = setTimeout(() => { if (autoplayRef.current) spin(); }, 100);
    return () => clearTimeout(timer);
  }, [spinning, spin]);

  const toggleAutoplay = useCallback(() => {
    autoplayRef.current = !autoplayRef.current;
    if (autoplayRef.current) spin();
  }, [spin]);

  const forceGrid = useCallback(async (
    forcedGrid: string[][], win: number, bonus: boolean, cascades: number
  ) => {
    rendererRef.current?.animateSpinStart();
    await new Promise((r) => setTimeout(r, 200));
    await rendererRef.current?.animateSpinStop(forcedGrid);
    setGrid(forcedGrid);
    setLastWin(win);
    setLastBonus(bonus);
    setLastCascades(cascades);
    setTotalWon((t) => t + win);
    if (win > 0 && config.feature_toggles.win_animations) rendererRef.current?.animateWin(win);
    if (cascades > 0) rendererRef.current?.animateCascade();
  }, [config.feature_toggles.win_animations]);

  const forceBonus = useCallback(() => {
    const g: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < rows; row++) col.push(row === 0 && r < 3 ? "scatter" : "hp1");
      g.push(col);
    }
    forceGrid(g, 50, true, 0);
  }, [reels, rows, forceGrid]);

  const forceMaxWin = useCallback(() => {
    const g: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < rows; row++) col.push("hp1");
      g.push(col);
    }
    forceGrid(g, (paytableLookup["hp1"]?.x5 ?? 250) * rows, false, 0);
  }, [reels, rows, paytableLookup, forceGrid]);

  const forceAllWilds = useCallback(() => {
    const g: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < rows; row++) col.push("wild");
      g.push(col);
    }
    forceGrid(g, (paytableLookup["hp1"]?.x5 ?? 250) * step1!.paylines, false, 0);
  }, [reels, rows, paytableLookup, step1, forceGrid]);

  const forceNearMiss = useCallback(() => {
    const g: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < rows; row++) col.push(r < reels - 1 ? "hp1" : "lp6");
      g.push(col);
    }
    forceGrid(g, 0, false, 0);
  }, [reels, rows, forceGrid]);

  const forceDeadSpin = useCallback(() => {
    const syms = ["lp1", "lp2", "lp3", "lp4", "lp5", "lp6"];
    const g: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < rows; row++) col.push(syms[(r + row) % syms.length]);
      g.push(col);
    }
    forceGrid(g, 0, false, 0);
  }, [reels, rows, forceGrid]);

  const forceCascadeChain = useCallback(() => {
    const g: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < rows; row++) col.push("hp2");
      g.push(col);
    }
    forceGrid(g, (paytableLookup["hp2"]?.x5 ?? 100) * rows * 3, false, 3);
  }, [reels, rows, paytableLookup, forceGrid]);

  const isDark = config.ui_skin === "dark";
  const bgClass = isDark ? "bg-gray-900 text-white" : config.ui_skin === "wireframe" ? "bg-white text-gray-900 border-2 border-gray-300" : "bg-gradient-to-b from-blue-50 to-white text-gray-900";
  const rtp = totalBet > 0 ? ((totalWon / totalBet) * 100).toFixed(2) : "—";

  if (!step1 || !step5) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-dashed p-8 text-center" style={{ borderColor: "var(--amber)", background: "rgba(240,176,64,.06)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>
          Complete Steps 1 and 5 (Math Model) before using the prototype.
        </p>
        <button onClick={onBack} className="mt-4 rounded-md border px-4 py-2 text-sm" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Configuration panel (collapsible) */}
      <div className="section-card !p-0">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center justify-between w-full px-4 py-2.5 text-left"
        >
          <span className="section-title" style={{ marginBottom: 0 }}>
            Configuration
          </span>
          <span className="text-[10px]" style={{ color: "var(--text3)" }}>{showConfig ? "▲" : "▼"}</span>
        </button>

        {showConfig && (
          <div className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-3 gap-4 mt-3">
              {/* Visual Mode */}
              <div>
                <label className="block text-[11px] mb-1.5" style={{ color: "var(--text3)" }}>Visual Mode</label>
                <div className="flex gap-1.5">
                  {(["emoji", "svg", "custom"] as VisualMode[]).map((m) => (
                    <button key={m} onClick={() => setConfig({ ...config, visual_mode: m })}
                      className="rounded-md px-3 py-1.5 text-[11px] font-medium capitalize border transition-colors"
                      style={{
                        background: config.visual_mode === m ? "var(--accent-soft)" : "var(--bg3)",
                        borderColor: config.visual_mode === m ? "var(--accent-border)" : "var(--border)",
                        color: config.visual_mode === m ? "var(--accent)" : "var(--text3)",
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* UI Skin */}
              <div>
                <label className="block text-[11px] mb-1.5" style={{ color: "var(--text3)" }}>UI Skin</label>
                <div className="flex gap-1.5">
                  {(["dark", "light", "wireframe"] as UiSkin[]).map((s) => (
                    <button key={s} onClick={() => setConfig({ ...config, ui_skin: s })}
                      className="rounded-md px-3 py-1.5 text-[11px] font-medium capitalize border transition-colors"
                      style={{
                        background: config.ui_skin === s ? "var(--accent-soft)" : "var(--bg3)",
                        borderColor: config.ui_skin === s ? "var(--accent-border)" : "var(--border)",
                        color: config.ui_skin === s ? "var(--accent)" : "var(--text3)",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demo Balance */}
              <div>
                <label className="block text-[11px] mb-1.5" style={{ color: "var(--text3)" }}>Demo Balance</label>
                <div className="flex gap-1.5">
                  {[500, 1000, 5000, "unlimited" as const].map((b) => (
                    <button key={String(b)} onClick={() => { setConfig({ ...config, demo_balance: b }); setBalance(typeof b === "number" ? b : 99999); }}
                      className="rounded-md px-3 py-1.5 text-[11px] font-medium border transition-colors"
                      style={{
                        background: config.demo_balance === b ? "var(--accent-soft)" : "var(--bg3)",
                        borderColor: config.demo_balance === b ? "var(--accent-border)" : "var(--border)",
                        color: config.demo_balance === b ? "var(--accent)" : "var(--text3)",
                      }}>
                      {b === "unlimited" ? "∞" : b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div>
              <label className="block text-[11px] mb-1.5" style={{ color: "var(--text3)" }}>Feature Toggles</label>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {(Object.entries(config.feature_toggles) as [keyof typeof config.feature_toggles, boolean][]).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--text2)" }}>
                    <input type="checkbox" checked={val}
                      onChange={() => setConfig({ ...config, feature_toggles: { ...config.feature_toggles, [key]: !val } })}
                      className="rounded border-gray-300"
                    />
                    {key.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top bar: speed + balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(["normal", "turbo", "instant"] as SpeedMode[]).map((s) => (
              <button key={s} onClick={() => setConfig({ ...config, speed: s })}
                className="rounded-md px-3 py-1.5 text-[11px] font-medium capitalize border transition-colors"
                style={{
                  background: config.speed === s ? "var(--accent-soft)" : "var(--bg3)",
                  borderColor: config.speed === s ? "var(--accent-border)" : "var(--border)",
                  color: config.speed === s ? "var(--accent)" : "var(--text3)",
                }}>
                {s}
              </button>
            ))}
          </div>
          <span className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--green-soft)", color: "var(--green)" }}>WASM Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[12px]" style={{ color: "var(--text2)" }}>
          <span>Balance: <b style={{ color: "var(--text)" }}>{config.demo_balance === "unlimited" ? "∞" : balance.toFixed(2)}</b></span>
          <span>Bet: <b style={{ color: "var(--text)" }}>{betSize}</b></span>
        </div>
      </div>

      {/* WASM error */}
      {wasmError && (
        <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: "var(--red)", background: "var(--red-soft)", color: "var(--red)" }}>
          WASM Engine Error: {wasmError}
        </div>
      )}

      {/* Game area */}
      <div className={`rounded-xl p-6 ${bgClass}`}>
        {!grid && (
          <div className="flex h-48 items-center justify-center">
            <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Press SPIN to start</p>
          </div>
        )}
        <div className={grid ? "" : "hidden"}>
          <SlotRenderer
            ref={rendererRef}
            reels={reels} rows={rows} skin={config.ui_skin}
            grid={grid} spinning={spinning} win={lastWin}
            bonusTriggered={lastBonus} cascadeCount={lastCascades}
            showWinAnimations={config.feature_toggles.win_animations}
            visualMode={config.visual_mode}
          />
        </div>

        {lastWin > 0 && !spinning && (
          <div className="mt-2 text-center">
            <p className={`text-2xl font-bold ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>WIN {lastWin.toFixed(2)}</p>
            {lastBonus && <p className={`text-sm font-medium ${isDark ? "text-purple-400" : "text-purple-600"}`}>BONUS TRIGGERED</p>}
            {lastCascades > 0 && <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{lastCascades} cascade{lastCascades > 1 ? "s" : ""}</p>}
          </div>
        )}

        {/* Controls */}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={spin} disabled={spinning || (config.demo_balance !== "unlimited" && balance < betSize)}
            className="rounded-full px-8 py-3 text-sm font-bold transition-colors"
            style={{
              background: spinning ? "var(--bg4)" : "var(--green)",
              color: spinning ? "var(--text3)" : "#fff",
            }}>
            {spinning ? "..." : "SPIN"}
          </button>
          {config.feature_toggles.autoplay && (
            <button onClick={toggleAutoplay}
              className="rounded-full px-4 py-3 text-xs font-medium"
              style={{
                background: autoplayRef.current ? "var(--red)" : "var(--bg4)",
                color: autoplayRef.current ? "#fff" : "var(--text2)",
              }}>
              {autoplayRef.current ? "STOP" : "AUTO"}
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-lg px-4 py-2 text-[11px]" style={{ background: "var(--bg2)", color: "var(--text3)" }}>
        <span>Spins: <b style={{ color: "var(--text2)" }}>{totalSpins}</b></span>
        <span>Won: <b style={{ color: "var(--text2)" }}>{totalWon.toFixed(2)}</b></span>
        <span>Wagered: <b style={{ color: "var(--text2)" }}>{totalBet.toFixed(2)}</b></span>
        {config.feature_toggles.rtp_debug && <span>RTP: <b style={{ color: "var(--accent)" }}>{rtp}%</b></span>}
      </div>

      {/* Director Mode */}
      <div className="section-card !p-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="section-title" style={{ marginBottom: 0 }}>
            Director Mode
          </span>
          <button onClick={() => setShowLog(!showLog)} className="text-[11px]" style={{ color: "var(--accent)" }}>
            {showLog ? "Hide Log" : "Show Log"}
          </button>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {/* Force Scenarios */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text3)" }}>Force Scenarios</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Bonus Trigger", fn: forceBonus, color: "var(--accent)" },
                { label: "Max Win", fn: forceMaxWin, color: "var(--amber)" },
                { label: "All Wilds", fn: forceAllWilds, color: "var(--amber)" },
                { label: "Cascade Chain", fn: forceCascadeChain, color: "var(--green)" },
                { label: "Near Miss", fn: forceNearMiss, color: "var(--amber)" },
                { label: "Dead Spin", fn: forceDeadSpin, color: "var(--text3)" },
              ].map((s) => (
                <button key={s.label} onClick={s.fn}
                  className="rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors"
                  style={{ borderColor: "var(--border)", color: s.color, background: "var(--bg3)" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Testing */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text3)" }}>Batch Testing</p>
            <div className="flex gap-1.5">
              <button onClick={() => { for (let i = 0; i < 20; i++) spin(); }}
                className="rounded-md border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--bg3)" }}>
                Dead Streak (20)
              </button>
              <button onClick={() => { for (let i = 0; i < 100; i++) spin(); }}
                className="rounded-md border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--bg3)" }}>
                Batch 100 Spins
              </button>
            </div>
          </div>

          {/* Spin log */}
          {showLog && (
            <div className="max-h-48 overflow-y-auto rounded-md border p-2" style={{ borderColor: "var(--border)", background: "var(--bg3)" }}>
              {spinLog.length === 0 ? (
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>No spins yet</p>
              ) : (
                spinLog.map((entry) => (
                  <div key={entry.spin}
                    className="flex items-center gap-2 border-b px-2 py-1 text-[11px]"
                    style={{
                      borderColor: "var(--border)",
                      color: entry.win > 0 ? "var(--green)" : entry.isBonus ? "var(--accent)" : "var(--text3)",
                    }}>
                    <span className="w-8 font-mono">#{entry.spin}</span>
                    <span className="flex-1">
                      {entry.grid.map((col) => col.map((s) => SYMBOL_EMOJI[s] ?? "?").join("")).join(" | ")}
                    </span>
                    <span className="w-16 text-right font-medium">
                      {entry.win > 0 ? `+${entry.win.toFixed(2)}` : "—"}
                    </span>
                    {entry.isBonus && <span style={{ color: "var(--accent)" }} className="font-medium">B</span>}
                    {entry.cascades > 0 && <span style={{ color: "var(--blue)" }}>C{entry.cascades}</span>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save & navigation */}
      <div className="flex justify-between">
        <button onClick={onBack}
          className="btn btn-secondary">
          Back to Step 6
        </button>
        <button onClick={() => onUpdate({ ...config, view_type: "designer" })}
          className="btn btn-solid btn-lg">
          Save & Continue
        </button>
      </div>
    </div>
  );
}
