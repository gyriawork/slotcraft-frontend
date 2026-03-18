const VARIANT_LABELS: Record<string, string> = {
  video_slot: "Video Slot",
  classic_slot: "Classic Slot",
  megaways: "Megaways Slot",
  cluster_pay: "Cluster Pay Slot",
  slot: "Slot",
  crash: "Crash Game",
  table: "Table Game",
};

const VOLATILITY_LABELS: Record<string, string> = {
  low: "Low",
  med_low: "Medium-Low",
  medium: "Medium",
  med_high: "Medium-High",
  high: "High",
};

const FEATURE_LABELS: Record<string, string> = {
  // variant-based keys (from Step3 feature catalog)
  standard: "Standard Wild",
  expanding: "Expanding Wild",
  sticky: "Sticky Wild",
  multiplier: "Multiplier Wild",
  walking: "Walking Wild",
  stacked: "Stacked Wild",
  free_spins: "Free Spins",
  pick_bonus: "Pick Bonus",
  wheel_of_fortune: "Wheel of Fortune",
  hold_respin: "Hold & Respin",
  bonus_buy: "Bonus Buy",
  cascading: "Cascading Reels",
  random_multiplier: "Random Multiplier",
  reel_expansion: "Reel Expansion",
  symbol_upgrade: "Symbol Upgrade",
  accumulator: "Accumulator",
  mystery_symbol: "Mystery Symbol",
  retrigger: "Retrigger",
  double_up: "Double Up",
  ladder: "Ladder",
  // fallback string keys
  wilds: "Wilds",
  cascade: "Cascading Reels",
  multipliers: "Multipliers",
  expanding_wilds: "Expanding Wilds",
  sticky_wilds: "Sticky Wilds",
  scatter: "Scatter",
  gamble: "Gamble Feature",
  jackpot: "Jackpot",
  megaways: "Megaways",
  cluster_pay: "Cluster Pay",
};

export interface ProductSheetData {
  title: string;
  game_type: string;
  grid: string;
  reels: string;
  rows: string;
  paylines: string;
  rtp: string;
  volatility: string;
  hit_frequency: string;
  max_win: string;
  bet_range: string;
  min_bet: string;
  max_bet: string;
  features: string[];
  description: string;
  art_style: string;
  markets: string[];
  simulation_verified: boolean;
  simulation_spins: string;
}

export function buildProductSheetData(
  wizardData: Record<string, unknown>,
  gameName: string
): ProductSheetData {
  const s1 = (wizardData.step1 ?? {}) as Record<string, unknown>;
  const s2 = (wizardData.step2 ?? {}) as Record<string, unknown>;
  const s3 = (wizardData.step3 ?? {}) as Record<string, unknown>;
  const s4 = (wizardData.step4 ?? {}) as Record<string, unknown>;
  const s6 = (wizardData.step6 ?? {}) as Record<string, unknown>;

  const grid = s1.grid as { reels?: number; rows?: number } | undefined;
  const betRange = s1.bet_range as { min?: number; max?: number } | undefined;
  const theme = (s4.theme ?? {}) as { description?: string };

  // Use simulation RTP if available, else target
  const rtp = typeof s6.rtp === "number" ? s6.rtp : (s2.target_rtp as number | undefined);
  const maxWin = typeof s6.max_win === "number" ? s6.max_win : (s2.max_win as number | undefined);
  const hitFreq = typeof s6.hit_frequency === "number" ? s6.hit_frequency : (s2.hit_frequency as number | undefined);

  const variant = (s1.variant as string) ?? (s1.game_type as string);
  const features = Array.isArray(s3.features) ? s3.features : [];

  return {
    title: gameName,
    game_type: VARIANT_LABELS[variant] ?? variant ?? "—",
    grid: grid?.reels && grid?.rows ? `${grid.reels}x${grid.rows}` : "—",
    reels: grid?.reels ? String(grid.reels) : "—",
    rows: grid?.rows ? String(grid.rows) : "—",
    paylines: s1.paylines ? String(s1.paylines) : "—",
    rtp: typeof rtp === "number" ? `${rtp.toFixed(2)}%` : "—",
    volatility: VOLATILITY_LABELS[s2.volatility as string] ?? (s2.volatility as string) ?? "—",
    hit_frequency: typeof hitFreq === "number" ? `${hitFreq.toFixed(1)}%` : "—",
    max_win: typeof maxWin === "number" ? `${maxWin.toLocaleString("en-US")}x` : "—",
    bet_range: betRange?.min !== undefined && betRange?.max !== undefined
      ? `$${betRange.min.toFixed(2)} – $${betRange.max.toFixed(2)}`
      : "—",
    min_bet: betRange?.min !== undefined ? `${betRange.min.toFixed(2)}` : "—",
    max_bet: betRange?.max !== undefined ? `${betRange.max.toFixed(2)}` : "—",
    features: features.map((f: unknown) => {
      if (typeof f === "string") return FEATURE_LABELS[f] ?? f.replace(/_/g, " ");
      const item = f as { variant?: string; type?: string; label?: string };
      if (item.label) return item.label;
      const key = item.variant ?? item.type ?? "";
      return FEATURE_LABELS[key] ?? key.replace(/_/g, " ");
    }),
    description: theme.description ?? "",
    art_style: ((s4.art_direction ?? {}) as { style?: string }).style ?? "",
    markets: Array.isArray(s1.markets) ? s1.markets : [],
    simulation_verified: s6.pass === true,
    simulation_spins: typeof s6.spins === "number"
      ? `${(s6.spins as number / 1_000_000).toFixed(0)}M`
      : "—",
  };
}
