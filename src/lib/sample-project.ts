/**
 * Sample project data for onboarding — a complete Aztec-themed 5x3 video slot.
 * All 9 steps pre-populated with realistic, internally-consistent data.
 */

import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
  Step8Data,
  Step9Data,
} from "./wizard-types";

export const SAMPLE_PROJECT_NAME = "Aztec Thunder";

export const sampleStep1: Step1Data = {
  game_type: "slot",
  variant: "video_slot",
  grid: { reels: 5, rows: 3 },
  win_mechanic: "fixed_paylines",
  paylines: 20,
  bet: { min: 0.2, max: 100, default: 1 },
  markets: ["mga", "ukgc"],
  market_constraints: {
    ukgc: { autoplay_disabled: true, bonus_buy_disabled: true, min_spin_time_ms: 2500 },
  },
};

export const sampleStep2: Step2Data = {
  target_rtp: 96,
  volatility: "med_high",
  hit_frequency: 28,
  max_win: 5000,
  bonus_frequency: 150,
  rtp_variants: [96, 94, 92],
};

export const sampleStep3: Step3Data = {
  features: [
    { type: "wild", variant: "expanding", config: { expand_on: "free_spins_only" } },
    { type: "bonus", variant: "free_spins", config: { trigger_count: 3, initial_spins: 10, retrigger: true } },
    { type: "enhancer", variant: "accumulator", config: { tiers: [1, 2, 3, 5, 10] } },
  ],
  complexity_score: 5,
  estimated_dev_weeks: 6,
};

export const sampleStep4: Step4Data = {
  sub_steps_complete: [true, true, true, true, true, true],
  brief: {
    theme_input: "Ancient Aztec temple with lightning storms",
    audience: ["eu mainstream", "latam casual"],
    mood: ["Epic", "Mystical"],
    references: [],
    creative_direction: "",
  },
  concepts: [
    {
      name: "Aztec Thunder",
      usp: "Lightning-charged expanding wilds during storm free spins",
      description: "Deep in the jungle, an ancient temple crackles with electric energy. Players must unlock the Storm Chamber to trigger expanding wilds that fill entire reels with lightning.",
      badge: "AI Pick",
      score: 8,
    },
  ],
  selected_concept: { source: "ai_generated", index: 0, name: "Aztec Thunder", usp: "Lightning-charged expanding wilds during storm free spins" },
  theme: {
    description: "Aztec temple surrounded by jungle, charged with perpetual lightning storms",
    usp_detail: "Expanding wilds electrified by lightning, filling reels during Storm Free Spins",
    bonus_narrative: "3 scatter stones open the Storm Chamber — lightning strikes random reels, turning them fully wild",
  },
  naming: { selected: "Aztec Thunder", alternatives: ["Temple of Storms", "Quetzal Strike"], localization: {}, reasoning: {} },
  symbols: [
    { id: "wild", name: "Lightning Wild", role: "wild" },
    { id: "scatter", name: "Storm Stone", role: "scatter" },
    { id: "hp1", name: "Quetzalcoatl", role: "high_pay" },
    { id: "hp2", name: "Jaguar", role: "high_pay" },
    { id: "hp3", name: "Eagle Warrior", role: "high_pay" },
    { id: "lp1", name: "A", role: "low_pay" },
    { id: "lp2", name: "K", role: "low_pay" },
    { id: "lp3", name: "Q", role: "low_pay" },
    { id: "lp4", name: "J", role: "low_pay" },
  ],
  art_direction: {
    style: "3D realistic with cinematic lighting",
    palette: ["#FFD700", "#1E3A5F", "#7B2D8E", "#2D5F1E"],
    sound: {
      ambient: "Jungle rain with distant thunder",
      spin: "Stone wheel turning",
      win: "Gold coins cascading",
      bonus_trigger: "Thunder crack + temple rumble",
      cascade: "Stone blocks crumbling",
      max_win: "Epic orchestral crescendo with lightning",
    },
  },
};

export const sampleStep5: Step5Data = {
  active_variant: "96.0",
  rtp_variants: {
    "96.0": {
      paytable: [
        { symbol_id: "hp1", label: "Quetzalcoatl", x3: 3, x4: 8, x5: 25 },
        { symbol_id: "hp2", label: "Jaguar", x3: 2.5, x4: 6, x5: 20 },
        { symbol_id: "hp3", label: "Eagle Warrior", x3: 2, x4: 5, x5: 15 },
        { symbol_id: "lp1", label: "A", x3: 0.8, x4: 2, x5: 5 },
        { symbol_id: "lp2", label: "K", x3: 0.6, x4: 1.5, x5: 4 },
        { symbol_id: "lp3", label: "Q", x3: 0.5, x4: 1.2, x5: 3 },
        { symbol_id: "lp4", label: "J", x3: 0.4, x4: 1, x5: 2.5 },
      ],
      reel_strips: {
        reel1: { wild: 2, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 8, lp2: 9, lp3: 10, lp4: 14 },
        reel2: { wild: 2, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 8, lp2: 9, lp3: 10, lp4: 14 },
        reel3: { wild: 2, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 8, lp2: 9, lp3: 10, lp4: 14 },
        reel4: { wild: 2, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 8, lp2: 9, lp3: 10, lp4: 14 },
        reel5: { wild: 2, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 8, lp2: 9, lp3: 10, lp4: 14 },
      },
      stops_per_reel: 60,
      analytical_rtp: 96.02,
    },
    "94.0": {
      paytable: [
        { symbol_id: "hp1", label: "Quetzalcoatl", x3: 2.8, x4: 7.5, x5: 23 },
        { symbol_id: "hp2", label: "Jaguar", x3: 2.3, x4: 5.5, x5: 18 },
        { symbol_id: "hp3", label: "Eagle Warrior", x3: 1.8, x4: 4.5, x5: 13 },
        { symbol_id: "lp1", label: "A", x3: 0.7, x4: 1.8, x5: 4.5 },
        { symbol_id: "lp2", label: "K", x3: 0.5, x4: 1.3, x5: 3.5 },
        { symbol_id: "lp3", label: "Q", x3: 0.4, x4: 1, x5: 2.5 },
        { symbol_id: "lp4", label: "J", x3: 0.3, x4: 0.8, x5: 2 },
      ],
      reel_strips: {
        reel1: { wild: 1, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 9, lp2: 9, lp3: 10, lp4: 14 },
        reel2: { wild: 1, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 9, lp2: 9, lp3: 10, lp4: 14 },
        reel3: { wild: 1, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 9, lp2: 9, lp3: 10, lp4: 14 },
        reel4: { wild: 1, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 9, lp2: 9, lp3: 10, lp4: 14 },
        reel5: { wild: 1, scatter: 2, hp1: 4, hp2: 5, hp3: 6, lp1: 9, lp2: 9, lp3: 10, lp4: 14 },
      },
      stops_per_reel: 60,
      analytical_rtp: 94.05,
    },
  },
  rtp_budget: { base_wins: 538, wild_substitution: 180, free_spins: 200, accumulator: 42 },
  target_rtp_tenths: 960,
};

export const sampleStep6: Step6Data = {
  rtp: 95.98,
  hit_frequency: 27.6,
  bonus_frequency: 148,
  max_win: 4820,
  volatility_sd: 8.2,
  spins: 10000000,
  total_wagered: 10000000,
  total_won: 9598000,
  winning_spins: 2760000,
  bonus_triggers: 67567,
  distribution_buckets: [7240000, 2200000, 400000, 120000, 30000, 8000, 1500, 400, 80, 20],
  timestamp: new Date().toISOString(),
  seed: 42,
  pass: true,
};

export const sampleStep7: Step7Data = {
  visual_mode: "emoji",
  ui_skin: "light",
  feature_toggles: {
    sound: true,
    win_animations: true,
    accumulator_ui: true,
    autoplay: true,
    paytable_visible: true,
    rtp_debug: false,
  },
  demo_balance: 1000,
  view_type: "stakeholder",
  speed: "normal",
};

export const sampleStep8: Step8Data = {
  template: {
    source_lang: "en",
    content: `GAME DESCRIPTION\n\n%Gamename is a \${reels}x\${rows} video slot with \${paylines} paylines.\n\nFEATURES\n\nThe game includes expanding wilds, free spins with retrigger, and accumulator multiplier.\n\nGAMEPLAY\n\nMinimum bet: \${minBet} \${currency}\nMaximum bet: \${maxBet} \${currency}\n\nRETURN TO PLAYER\n\nThe theoretical return to player (RTP) is \${rtp}%.\nVolatility: \${volatility}\nMaximum win: \${maxWin}x total bet.\n\nRANDOMIZATION\n\nAll game outcomes are determined by a certified Random Number Generator (RNG). The results of each round are independent and not influenced by previous results.`,
    uploaded_file_url: null,
    auto_generated: true,
  },
  variables: {
    "%Gamename": { value: "Aztec Thunder", source: "auto", step_ref: "step4.naming.selected" },
    "${reels}": { value: "5", source: "auto", step_ref: "step1.grid.reels" },
    "${rows}": { value: "3", source: "auto", step_ref: "step1.grid.rows" },
    "${paylines}": { value: "20", source: "auto", step_ref: "step1.paylines" },
    "${rtp}": { value: "95.98", source: "auto", step_ref: "step6.rtp" },
    "${minBet}": { value: "0.20", source: "auto", step_ref: "step1.bet.min" },
    "${maxBet}": { value: "100.00", source: "auto", step_ref: "step1.bet.max" },
    "${currency}": { value: "EUR", source: "auto", step_ref: "step1.bet.currency" },
    "${volatility}": { value: "med_high", source: "auto", step_ref: "step2.volatility" },
    "${maxWin}": { value: "4820", source: "auto", step_ref: "step6.max_win" },
  },
  translations: {
    en: { status: "source", content: null, updated_at: new Date().toISOString() },
    de: { status: "translated", content: "[DE] Aztec Thunder Spielregeln...", updated_at: new Date().toISOString() },
    es: { status: "translated", content: "[ES] Reglas del juego Aztec Thunder...", updated_at: new Date().toISOString() },
    fr: { status: "empty", content: null, updated_at: null },
    ru: { status: "empty", content: null, updated_at: null },
  },
  languages: ["bg", "cs", "de", "en", "ens", "es", "fr", "hr", "hu", "it", "ja", "ko", "lt", "pl", "pt", "ptpt", "ro", "ru", "th", "tr", "uk", "zh"],
  custom_languages: [],
};

export const sampleStep9: Step9Data = {
  sections: [
    { id: "overview", title: "Game Overview", source_step: 1, ready: true, content: "Aztec Thunder is a 5x3 video slot with 20 fixed paylines.", notes: "" },
    { id: "math", title: "Mathematics", source_step: 5, ready: true, content: "Target RTP 96.0% with med-high volatility.", notes: "" },
    { id: "features", title: "Features", source_step: 3, ready: true, content: "Expanding wilds, free spins with retrigger, accumulator multiplier.", notes: "" },
    { id: "theme", title: "Theme & Art", source_step: 4, ready: true, content: "Aztec temple with lightning storms. 3D realistic cinematic style.", notes: "" },
    { id: "simulation", title: "Simulation Results", source_step: 6, ready: true, content: "10M spins: RTP 95.98%, hit frequency 27.6%, max win 4820x.", notes: "" },
  ],
  selected_audience: "full",
  custom_notes: {},
  exports: [],
};

/** All step data bundled for creating a sample project */
export const sampleStepData = {
  step1: sampleStep1,
  step2: sampleStep2,
  step3: sampleStep3,
  step4: sampleStep4,
  step5: sampleStep5,
  step6: sampleStep6,
  step7: sampleStep7,
  step8: sampleStep8,
  step9: sampleStep9,
};
