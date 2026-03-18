"use client";

import { useState, useCallback, useEffect } from "react";
import {
  runSimulation,
  terminateWorker,
  type SimResult,
  type SimulationConfig,
} from "./simulation";

type SimulationStatus = "idle" | "running" | "complete" | "error";

export function useSimulation() {
  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(
    async (config: SimulationConfig, spinCount: number, seed?: number) => {
      setStatus("running");
      setResult(null);
      setError(null);

      try {
        const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 32);
        const simResult = await runSimulation(config, spinCount, actualSeed);
        setResult(simResult);
        setStatus("complete");
        return simResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus("error");
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => terminateWorker();
  }, []);

  return { status, result, error, simulate, reset };
}
