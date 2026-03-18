/** Simulation engine types matching Rust SimResult */
export interface SimResult {
  spins: number;
  total_wagered: number;
  total_won: number;
  sum_win_squared: number;
  winning_spins: number;
  bonus_triggers: number;
  max_win: number;
  distribution_buckets: number[];
  rtp: number;
  hit_frequency: number;
  bonus_frequency: number;
  volatility_sd: number;
  convergence?: Array<{ spin: number; rtp: number }>;
}

/** Matches Rust Symbol enum serialization */
export type RustSymbol = "Wild" | "Scatter" | { Regular: number };

export interface SimulationConfig {
  reels: number;
  rows: number;
  reel_strips: {
    weights: Array<[RustSymbol, number]>;
  }[];
  paytable: Array<{
    symbol: RustSymbol;
    count: number;
    payout: number;
  }>;
  paylines: number[][];
  features: {
    cascade_enabled: boolean;
    accumulator_tiers: Array<{
      min_cascades: number;
      max_cascades: number;
      multiplier: number;
    }>;
    free_spins_enabled: boolean;
    free_spin_awards: Record<string, number>;
    retrigger_spins: number;
    max_total_free_spins: number;
    wild_config: { wild_type: "Standard" | "Expanding" | "Sticky" | "Walking" | { Multiplier: number } | { Stacked: number } };
  };
  bet: number;
}

/** Result of a single spin from the WASM engine */
export interface SingleSpinResult {
  grid: string[][]; // columns × rows of symbol IDs ("wild", "scatter", "hp1", etc.)
  total_win: number;
  base_win: number;
  cascade_count: number;
  bonus_triggered: boolean;
  bonus_win: number;
  scatter_count: number;
}

type SimulationStatus = "idle" | "loading" | "running" | "complete" | "error";

interface SimulationState {
  status: SimulationStatus;
  result: SimResult | null;
  error: string | null;
}

let worker: Worker | null = null;
let messageId = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingCallbacks = new Map<
  number,
  { resolve: (r: any) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/wasm/simulation-worker.js", { type: "module" });
    worker.onmessage = (e) => {
      const { id, type, result, error } = e.data;
      const cb = pendingCallbacks.get(id);
      if (!cb) return;
      pendingCallbacks.delete(id);

      if (type === "result") {
        cb.resolve(result);
      } else {
        cb.reject(new Error(error));
      }
    };
    worker.onerror = (e) => {
      // Reject all pending callbacks
      for (const [id, cb] of pendingCallbacks) {
        cb.reject(new Error(`Worker error: ${e.message}`));
        pendingCallbacks.delete(id);
      }
    };
  }
  return worker;
}

/** Run a simulation in a Web Worker. Returns a promise with the result. */
export function runSimulation(
  config: SimulationConfig,
  spinCount: number,
  seed: number
): Promise<SimResult> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pendingCallbacks.set(id, { resolve, reject });
    getWorker().postMessage({
      id,
      type: "simulate",
      payload: { config, spinCount, seed },
    });
  });
}

/** Run a single spin in a Web Worker. Returns the grid + win result. */
export function spinOnce(
  config: SimulationConfig,
  seed: number
): Promise<SingleSpinResult> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pendingCallbacks.set(id, { resolve, reject });
    getWorker().postMessage({
      id,
      type: "spin_once",
      payload: { config, seed },
    });
  });
}

/** Terminate the worker (cleanup) */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    for (const [, cb] of pendingCallbacks) {
      cb.reject(new Error("Worker terminated"));
    }
    pendingCallbacks.clear();
  }
}
