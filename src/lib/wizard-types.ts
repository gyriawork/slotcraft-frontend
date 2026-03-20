/** Wizard step definitions and shared types */

export const WIZARD_STEPS = [
  { number: 0, label: "Overview", path: "overview" },
  { number: 1, label: "Game Setup", path: "setup" },
  { number: 2, label: "Volatility", path: "volatility" },
  { number: 3, label: "Features", path: "features" },
  { number: 4, label: "Concept", path: "concept" },
  { number: 5, label: "Math Model", path: "math" },
  { number: 6, label: "Simulation", path: "simulation" },
  { number: 7, label: "Prototype", path: "prototype" },
  { number: 8, label: "Rules", path: "rules" },
  { number: 9, label: "Export", path: "export" },
] as const;

export type GameType = "slot" | "crash" | "table";

export type SlotVariant =
  | "video_slot"
  | "classic"
  | "megaways"
  | "cluster"
  | "hold_spin";

export type WinMechanic =
  | "fixed_paylines"
  | "adjustable_paylines"
  | "all_ways"
  | "cluster";

export type Market =
  | "mga"
  | "ukgc"
  | "ggl"
  | "latam"
  | "asia"
  | "curacao"
  | "ontario"
  | "sweden";

export type Volatility =
  | "low"
  | "med_low"
  | "med"
  | "med_high"
  | "high"
  | "extreme";

export interface GridConfig {
  reels: number;
  rows: number;
}

export interface BetConfig {
  min: number;
  max: number;
  default: number;
}

export interface MarketConstraints {
  autoplay_disabled?: boolean;
  bonus_buy_disabled?: boolean;
  max_bet_cap?: number;
  min_spin_time_ms?: number;
}

/** Step 1: Game Setup data */
export interface Step1Data {
  game_type: GameType;
  variant: string;
  grid: GridConfig;
  win_mechanic: WinMechanic;
  paylines: number;
  bet: BetConfig;
  markets: Market[];
  market_constraints: Record<string, MarketConstraints>;
}

/** Step 2: Volatility & Metrics data */
export interface Step2Data {
  target_rtp: number;
  volatility: Volatility;
  hit_frequency: number;
  max_win: number;
  bonus_frequency: number;
  rtp_variants: number[];
}

/** Feature types */
export type FeatureType = "wild" | "bonus" | "enhancer" | "gamble" | "custom";

export type WildVariant =
  | "standard"
  | "expanding"
  | "sticky"
  | "multiplier"
  | "walking"
  | "stacked";

export type BonusVariant =
  | "free_spins"
  | "pick_bonus"
  | "wheel_of_fortune"
  | "hold_respin"
  | "bonus_buy"
  | "cascading";

export type EnhancerVariant =
  | "random_multiplier"
  | "reel_expansion"
  | "symbol_upgrade"
  | "accumulator"
  | "mystery_symbol"
  | "retrigger";

export type GambleVariant = "double_up" | "ladder";

export type FeatureVariant =
  | WildVariant
  | BonusVariant
  | EnhancerVariant
  | GambleVariant
  | (string & {});  // allow custom variant strings

export interface FeatureItem {
  type: FeatureType;
  variant: FeatureVariant;
  config: Record<string, unknown>;
}

/** Step 3: Feature Builder data */
export interface Step3Data {
  features: FeatureItem[];
  complexity_score: number;
  estimated_dev_weeks: number;
}

/** Step 4: AI Concept data */

export interface SaturationData {
  theme_label: string;
  game_count: number;
  saturation_pct: number;
  top_competitors: Array<{ name: string; provider: string }>;
  hints: string[];
}

export interface ConceptBrief {
  theme_input: string;
  creative_direction: string;
  audience: string[];
  mood: string[]; // deprecated — kept for backward compat
  references: string[];
  saturation?: SaturationData;
}

export interface ConceptCard {
  name: string;
  usp: string;
  description: string;
  badge?: string;
  score?: number;
  reasoning?: string;
  market_context?: string;
}

export interface SelectedConcept {
  source: "ai_generated" | "custom";
  index?: number;
  name: string;
  usp: string;
}

export interface ThemeData {
  description: string;
  usp_detail: string;
  bonus_narrative: string;
}

export interface NamingData {
  selected: string;
  alternatives: string[];
  reasoning: Record<string, string>;
  localization: Record<string, string>;
}

export interface SymbolDef {
  id: string;
  name: string;
  role: "wild" | "scatter" | "high_pay" | "low_pay";
  emoji?: string;
  description?: string;
}

export interface ArtDirection {
  style: string;
  palette: string[];
  sound: {
    ambient: string;
    spin: string;
    win: string;
    bonus_trigger: string;
    cascade: string;
    max_win: string;
  };
}

export interface Step4Data {
  sub_steps_complete: boolean[];
  brief: ConceptBrief;
  concepts: ConceptCard[];
  selected_concept: SelectedConcept | null;
  theme: ThemeData;
  naming: NamingData;
  symbols: SymbolDef[];
  art_direction: ArtDirection;
}

/** Step 5: Math Model data */

/** RTP budget breakdown — stored as integer tenths of percent (538 = 53.8%) */
export interface RtpBudget {
  base_wins: number;
  wild_substitution: number;
  free_spins: number;
  accumulator: number;
}

/** Paytable entry: payout multipliers per match count */
export interface PaytableRow {
  symbol_id: string;
  label: string;
  x3: number;
  x4: number;
  x5: number;
}

/** Reel strip weights for a single reel: symbol_id → weight (integer, sum = stops_per_reel) */
export type ReelWeights = Record<string, number>;

/** Per-RTP-variant data */
export interface RtpVariantData {
  paytable: PaytableRow[];
  reel_strips: Record<string, ReelWeights>; // reel1..reel5 → symbol weights
  stops_per_reel: number;
  analytical_rtp: number;
}

/** Step 5 data */
export interface Step5Data {
  /** Active RTP variant key, e.g. "96.0" */
  active_variant: string;
  /** All RTP variant data keyed by RTP string */
  rtp_variants: Record<string, RtpVariantData>;
  /** RTP budget breakdown (integer tenths of percent) */
  rtp_budget: RtpBudget;
  /** Target RTP from Step 2 (integer tenths, e.g. 960 = 96.0%) */
  target_rtp_tenths: number;
}

/** Step 6: Simulation Results data */
export interface Step6Data {
  rtp: number;
  hit_frequency: number;
  bonus_frequency: number;
  max_win: number;
  volatility_sd: number;
  spins: number;
  total_wagered: number;
  total_won: number;
  winning_spins: number;
  bonus_triggers: number;
  distribution_buckets: number[];
  timestamp: string;
  seed: number;
  pass: boolean;
}

/** Step 7: HTML5 Prototype data */
export type VisualMode = "emoji" | "svg" | "custom";
export type UiSkin = "dark" | "light" | "wireframe";
export type ViewType = "stakeholder" | "designer";
export type SpeedMode = "normal" | "turbo" | "instant";

export interface FeatureToggles {
  sound: boolean;
  win_animations: boolean;
  accumulator_ui: boolean;
  autoplay: boolean;
  paytable_visible: boolean;
  rtp_debug: boolean;
}

export interface Step7Data {
  visual_mode: VisualMode;
  ui_skin: UiSkin;
  feature_toggles: FeatureToggles;
  demo_balance: number | "unlimited";
  view_type: ViewType;
  speed: SpeedMode;
  survey_response?: string;
}

/** Step 8: Rules & Translations data */

export type TranslationStatus = "source" | "translated" | "draft" | "empty";

export interface ResolvedVariable {
  value: string;
  source: "auto" | "manual";
  step_ref: string | null;
}

export interface TranslationEntry {
  status: TranslationStatus;
  content: string | null;
  updated_at: string | null;
}

export interface RulesTemplate {
  source_lang: string;
  content: string;
  uploaded_file_url: string | null;
  auto_generated: boolean;
}

export interface Step8Data {
  template: RulesTemplate;
  variables: Record<string, ResolvedVariable>;
  translations: Record<string, TranslationEntry>;
  languages: string[];
  custom_languages: string[];
}

/** Step 9: GDD Export data */
export type GddAudience = "full" | "math" | "art" | "dev" | "executive";
export type GddFormat = "pdf" | "notion" | "jira" | "confluence" | "markdown" | "json";

export interface GddSection {
  id: string;
  title: string;
  source_step: number;
  ready: boolean;
  content: string;
  notes: string;
}

export interface Step9Data {
  sections: GddSection[];
  selected_audience: GddAudience;
  custom_notes: Record<string, string>;
  exports: Array<{ format: GddFormat; audience: GddAudience; timestamp: string }>;
}

/** Validity status per step */
export type StepValidity = "valid" | "stale" | "invalid" | "empty";

/** Full project wizard state */
export interface WizardState {
  step1?: Step1Data;
  step2?: Step2Data;
  step3?: Step3Data;
  step4?: Step4Data;
  step5?: Step5Data;
  step7?: Step7Data;
  step8?: Step8Data;
  step9?: Step9Data;
  currentStep: number;
  stepValidity: Record<number, StepValidity>;
}
