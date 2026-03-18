"use client";

import { useState, useMemo, useCallback } from "react";
import { Hint } from "./hint";
import type {
  FeatureType,
  FeatureVariant,
  FeatureItem,
  Step3Data,
  MarketConstraints,
} from "@/lib/wizard-types";

interface FeatureDef {
  type: FeatureType;
  variant: FeatureVariant;
  label: string;
  description: string;
  complexity: number; // 1-5 per feature
}

const FEATURE_CATALOG: FeatureDef[] = [
  // Wilds
  { type: "wild", variant: "standard", label: "Standard Wild", description: "Substitutes for all symbols except scatter", complexity: 1 },
  { type: "wild", variant: "expanding", label: "Expanding Wild", description: "Expands to fill entire reel on landing", complexity: 2 },
  { type: "wild", variant: "sticky", label: "Sticky Wild", description: "Remains in place for multiple spins", complexity: 2 },
  { type: "wild", variant: "multiplier", label: "Multiplier Wild", description: "Multiplies wins by 2x-10x when part of winning line", complexity: 3 },
  { type: "wild", variant: "walking", label: "Walking Wild", description: "Moves one reel per spin until off-screen", complexity: 3 },
  { type: "wild", variant: "stacked", label: "Stacked Wild", description: "Multiple wilds stacked on same reel", complexity: 1 },

  // Bonus Rounds
  { type: "bonus", variant: "free_spins", label: "Free Spins", description: "Triggered by scatters, awards free spins", complexity: 3 },
  { type: "bonus", variant: "pick_bonus", label: "Pick Bonus", description: "Player picks items to reveal prizes", complexity: 2 },
  { type: "bonus", variant: "wheel_of_fortune", label: "Wheel of Fortune", description: "Spin a wheel for prizes or multipliers", complexity: 2 },
  { type: "bonus", variant: "hold_respin", label: "Hold & Respin", description: "Specific symbols lock while others respin", complexity: 3 },
  { type: "bonus", variant: "bonus_buy", label: "Bonus Buy", description: "Purchase direct entry to bonus round (Nx bet)", complexity: 1 },
  { type: "bonus", variant: "cascading", label: "Cascading Reels", description: "Winning symbols removed, new ones fall in", complexity: 4 },

  // Enhancers
  { type: "enhancer", variant: "random_multiplier", label: "Random Multiplier", description: "Random multiplier applied to wins", complexity: 2 },
  { type: "enhancer", variant: "reel_expansion", label: "Reel Expansion", description: "Grid expands during bonus", complexity: 3 },
  { type: "enhancer", variant: "symbol_upgrade", label: "Symbol Upgrade", description: "Low-pay symbols upgrade to higher-pay", complexity: 2 },
  { type: "enhancer", variant: "accumulator", label: "Accumulator", description: "Progressive multiplier increases with cascades", complexity: 3 },
  { type: "enhancer", variant: "mystery_symbol", label: "Mystery Symbol", description: "Transforms into random matching symbol", complexity: 2 },
  { type: "enhancer", variant: "retrigger", label: "Retrigger", description: "Bonus can retrigger for additional spins", complexity: 1 },

  // Gamble
  { type: "gamble", variant: "double_up", label: "Double Up", description: "Risk winnings for 2x or nothing", complexity: 1 },
  { type: "gamble", variant: "ladder", label: "Ladder", description: "Climb a prize ladder with risk/collect choices", complexity: 2 },
];

const CATEGORY_LABELS: Record<FeatureType, string> = {
  wild: "Wilds",
  bonus: "Bonus Rounds",
  enhancer: "Enhancers",
  gamble: "Gamble",
};

/** Map of features restricted by market constraints */
const MARKET_FEATURE_RESTRICTIONS: Record<string, { market: string; feature: FeatureVariant; reason: string }[]> = {};

function getFeatureWarnings(
  variant: FeatureVariant,
  markets: string[],
  constraints: Record<string, MarketConstraints>
): string[] {
  const warnings: string[] = [];
  for (const market of markets) {
    const c = constraints[market];
    if (!c) continue;
    if (variant === "bonus_buy" && c.bonus_buy_disabled) {
      warnings.push(`Bonus Buy is prohibited in ${market.toUpperCase()}`);
    }
    if (variant === "double_up" && c.bonus_buy_disabled) {
      warnings.push(`Gamble features restricted in ${market.toUpperCase()}`);
    }
    if (variant === "ladder" && c.bonus_buy_disabled) {
      warnings.push(`Gamble features restricted in ${market.toUpperCase()}`);
    }
  }
  return warnings;
}

interface Step3Props {
  data?: Partial<Step3Data>;
  onUpdate: (data: Step3Data) => void;
  onBack: () => void;
  /** Markets selected in Step 1 */
  markets?: string[];
  /** Market constraints from Step 1 */
  marketConstraints?: Record<string, MarketConstraints>;
}

export function Step3Features({ data, onUpdate, onBack, markets = [], marketConstraints = {} }: Step3Props) {
  const [selected, setSelected] = useState<FeatureItem[]>(
    data?.features ?? [
      { type: "wild", variant: "standard", config: {} },
      { type: "bonus", variant: "free_spins", config: { count: 10, retrigger_spins: 5, max_total: 50 } },
    ]
  );
  const [expandedVariant, setExpandedVariant] = useState<FeatureVariant | null>(null);

  function isSelected(variant: FeatureVariant) {
    return selected.some((f) => f.variant === variant);
  }

  function toggleFeature(def: FeatureDef) {
    if (isSelected(def.variant)) {
      setSelected((prev) => prev.filter((f) => f.variant !== def.variant));
      if (expandedVariant === def.variant) setExpandedVariant(null);
    } else {
      setSelected((prev) => [
        ...prev,
        { type: def.type, variant: def.variant, config: getDefaultConfig(def.variant) },
      ]);
      // Auto-expand config if it has configurable fields
      const cfg = getDefaultConfig(def.variant);
      if (Object.keys(cfg).length > 0) setExpandedVariant(def.variant);
    }
  }

  const updateFeatureConfig = useCallback((variant: FeatureVariant, config: Record<string, unknown>) => {
    setSelected((prev) =>
      prev.map((f) => (f.variant === variant ? { ...f, config } : f))
    );
  }, []);

  const complexity = useMemo(() => {
    return selected.reduce((sum, f) => {
      const def = FEATURE_CATALOG.find((d) => d.variant === f.variant);
      return sum + (def?.complexity ?? 1);
    }, 0);
  }, [selected]);

  const devWeeks = useMemo(() => {
    if (complexity <= 4) return 2;
    if (complexity <= 8) return 4;
    if (complexity <= 12) return 6;
    if (complexity <= 16) return 8;
    return 12;
  }, [complexity]);

  function handleSave() {
    onUpdate({
      features: selected,
      complexity_score: Math.min(complexity, 20),
      estimated_dev_weeks: devWeeks,
    });
  }

  const categories: FeatureType[] = ["wild", "bonus", "enhancer", "gamble"];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Feature categories */}
      {categories.map((cat) => {
        const features = FEATURE_CATALOG.filter((f) => f.type === cat);
        return (
          <section key={cat}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {features.map((def) => {
                const active = isSelected(def.variant);
                const featureItem = selected.find((f) => f.variant === def.variant);
                const hasConfig = Object.keys(getDefaultConfig(def.variant)).length > 0;
                const isExpanded = expandedVariant === def.variant && active;

                return (
                  <div key={def.variant} className="flex flex-col">
                    <button
                      onClick={() => toggleFeature(def)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors ${isExpanded ? "rounded-b-none" : ""}`}
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        background: active ? "var(--accent-soft)" : "var(--surface)",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border"
                        style={{
                          borderColor: active ? "var(--accent)" : "var(--border)",
                          background: active ? "var(--accent)" : "transparent",
                          color: active ? "#fff" : "var(--text3)",
                        }}
                      >
                        {active && (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                            {def.label}
                          </span>
                          <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--bg2)", color: "var(--text3)" }}>
                            +{def.complexity}
                          </span>
                          {active && hasConfig && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedVariant(isExpanded ? null : def.variant);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  setExpandedVariant(isExpanded ? null : def.variant);
                                }
                              }}
                              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer"
                              style={{ color: "var(--accent)" }}
                            >
                              {isExpanded ? "Close" : "Configure"}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>{def.description}</p>
                        {(() => {
                          const warnings = getFeatureWarnings(def.variant, markets, marketConstraints);
                          return warnings.length > 0 ? (
                            <div className="mt-1 space-y-0.5">
                              {warnings.map((w) => (
                                <p key={w} className="text-[10px] font-medium text-amber-600">
                                  {w}
                                </p>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </button>
                    {isExpanded && featureItem && (
                      <FeatureConfigEditor
                        variant={def.variant}
                        config={featureItem.config}
                        onChange={(cfg) => updateFeatureConfig(def.variant, cfg)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Complexity meter */}
      <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Complexity: {Math.min(complexity, 20)}/20
            </span>
            <span className="ml-3 text-xs" style={{ color: "var(--text3)" }}>
              ~{devWeeks} dev weeks estimated
            </span>
          </div>
          <span className="text-sm font-mono" style={{ color: "var(--text2)" }}>
            {selected.length} features selected
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full" style={{ background: "var(--bg2)" }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min((complexity / 20) * 100, 100)}%`,
              background: complexity <= 8 ? "var(--green)" : complexity <= 14 ? "var(--amber)" : "var(--red)",
            }}
          />
        </div>
        {complexity > 14 && (
          <Hint level="warn">High complexity — consider reducing features for MVP</Hint>
        )}
      </section>

      {/* Navigation */}
      <div className="flex justify-between border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onBack}
          className="rounded-md border px-6 py-2.5 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text2)" }}
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={selected.length === 0}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)" }}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

/** Config schema per variant — defines editable fields */
interface ConfigFieldDef {
  key: string;
  label: string;
  type: "number" | "select" | "number_array";
  min?: number;
  max?: number;
  options?: string[];
  hint?: string;
}

function getConfigFields(variant: FeatureVariant): ConfigFieldDef[] {
  switch (variant) {
    case "multiplier":
      return [
        { key: "min", label: "Min multiplier", type: "number", min: 2, max: 10 },
        { key: "max", label: "Max multiplier", type: "number", min: 2, max: 100 },
      ];
    case "free_spins":
      return [
        { key: "count", label: "Initial spins", type: "number", min: 3, max: 50 },
        { key: "retrigger_spins", label: "Retrigger spins", type: "number", min: 0, max: 20 },
        { key: "max_total", label: "Max total spins", type: "number", min: 10, max: 100, hint: "Hard cap per PITFALLS.md" },
      ];
    case "bonus_buy":
      return [
        { key: "price_multiplier", label: "Price (x bet)", type: "number", min: 50, max: 500, hint: "Disabled in UKGC/Sweden markets" },
      ];
    case "accumulator":
      return [
        { key: "tiers", label: "Multiplier tiers", type: "number_array", hint: "Comma-separated, e.g. 1,2,5,10,25" },
      ];
    case "expanding":
      return [
        { key: "direction", label: "Direction", type: "select", options: ["vertical", "horizontal", "cross"] },
      ];
    case "stacked":
      return [
        { key: "stack_height", label: "Stack height", type: "number", min: 2, max: 5, hint: "Rows covered per wild" },
      ];
    case "random_multiplier":
      return [
        { key: "min", label: "Min multiplier", type: "number", min: 2, max: 5 },
        { key: "max", label: "Max multiplier", type: "number", min: 5, max: 100 },
      ];
    case "hold_respin":
      return [
        { key: "respins", label: "Number of respins", type: "number", min: 1, max: 5 },
        { key: "lock_symbol", label: "Lock symbol type", type: "select", options: ["any", "scatter", "wild"] },
      ];
    case "reel_expansion":
      return [
        { key: "max_rows", label: "Max expanded rows", type: "number", min: 4, max: 10 },
      ];
    case "symbol_upgrade":
      return [
        { key: "tiers", label: "Upgrade tiers", type: "number", min: 1, max: 5 },
      ];
    default:
      return [];
  }
}

function FeatureConfigEditor({
  variant,
  config,
  onChange,
}: {
  variant: FeatureVariant;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const fields = getConfigFields(variant);
  if (fields.length === 0) return null;

  const updateField = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="rounded-b-lg border-2 border-t-0 px-4 py-3 space-y-3" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Configuration</p>
      {fields.map((field) => (
        <div key={field.key} className="flex items-center gap-3">
          <label className="w-32 text-xs font-medium flex-shrink-0" style={{ color: "var(--text2)" }}>
            {field.label}
          </label>
          {field.type === "number" && (
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={(config[field.key] as number) ?? field.min ?? 0}
              onChange={(e) => updateField(field.key, Number(e.target.value))}
              className="w-20 rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-1"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          )}
          {field.type === "select" && (
            <select
              value={(config[field.key] as string) ?? field.options?.[0] ?? ""}
              onChange={(e) => updateField(field.key, e.target.value)}
              className="rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-1"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {field.type === "number_array" && (
            <input
              type="text"
              value={Array.isArray(config[field.key])
                ? (config[field.key] as number[]).join(", ")
                : ""}
              onChange={(e) => {
                const nums = e.target.value
                  .split(",")
                  .map((s) => Number(s.trim()))
                  .filter((n) => !isNaN(n) && n > 0);
                updateField(field.key, nums);
              }}
              placeholder={field.hint}
              className="flex-1 rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-1"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          )}
          {field.hint && field.type !== "number_array" && (
            <span className="text-[10px]" style={{ color: "var(--text3)" }}>{field.hint}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function getDefaultConfig(variant: FeatureVariant): Record<string, unknown> {
  switch (variant) {
    case "multiplier":
      return { min: 2, max: 5 };
    case "free_spins":
      return { count: 10, retrigger_spins: 5, max_total: 50 };
    case "bonus_buy":
      return { price_multiplier: 100 };
    case "accumulator":
      return { tiers: [1, 2, 5, 10, 25] };
    case "expanding":
      return { direction: "vertical" };
    case "stacked":
      return { stack_height: 3 };
    case "random_multiplier":
      return { min: 2, max: 10 };
    case "hold_respin":
      return { respins: 3, lock_symbol: "any" };
    case "reel_expansion":
      return { max_rows: 7 };
    case "symbol_upgrade":
      return { tiers: 3 };
    default:
      return {};
  }
}
