/**
 * Shared constants used across multiple components.
 * Single source of truth — no duplicating these values in page components.
 */

import { WIZARD_STEPS } from "./wizard-types";

/** Total number of wizard steps (excluding step 0 Overview) */
export const TOTAL_WIZARD_STEPS = WIZARD_STEPS.filter((s) => s.number > 0).length; // 8

/** Step number → display label, derived from WIZARD_STEPS */
export const STEP_NAMES: Record<number, string> = Object.fromEntries(
  WIZARD_STEPS.filter((s) => s.number > 0).map((s) => [s.number, s.label]),
);

/** Volatility key → display label (supports both hyphen and underscore variants) */
export const VOLATILITY_LABELS: Record<string, string> = {
  low: "Low",
  "med-low": "Med-Low",
  med_low: "Med-Low",
  medium: "Medium",
  med: "Med",
  "med-high": "Med-High",
  med_high: "Med-High",
  high: "High",
  ultra: "Ultra",
};

/** Game type → icon letter */
export const TYPE_LETTER: Record<string, string> = {
  slot: "S",
  crash: "C",
  table: "T",
};

/** Game type → gradient background */
export const TYPE_GRADIENTS: Record<string, string> = {
  slot: "linear-gradient(135deg, #7c6bf5, #a78bfa)",
  crash: "linear-gradient(135deg, #f59e0b, #ef4444)",
  table: "linear-gradient(135deg, #10b981, #06b6d4)",
};

/** Project timeline date field → display label */
export const DATE_LABELS: Record<string, string> = {
  development_start: "Dev start",
  development_end: "Dev end",
  tech_release: "Tech release",
  pre_release: "Pre-release",
  marketing_release: "Marketing release",
};
