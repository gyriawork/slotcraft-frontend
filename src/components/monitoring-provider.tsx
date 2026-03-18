"use client";

import { useEffect } from "react";
import { initSentry, initPostHog } from "@/lib/monitoring";

/** Client-side monitoring initializer — add to root layout */
export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry();
    initPostHog();
  }, []);

  return <>{children}</>;
}
