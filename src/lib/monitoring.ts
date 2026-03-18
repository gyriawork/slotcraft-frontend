import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

let sentryInitialized = false;
let posthogInitialized = false;

/** Initialize Sentry error tracking (call once in app layout) */
export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || sentryInitialized) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
  sentryInitialized = true;
}

/** Initialize PostHog analytics (call once in app layout, client-side only) */
export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key || posthogInitialized || typeof window === "undefined") return;

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // manual events only for now
  });
  posthogInitialized = true;
}

/** Track a custom analytics event */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, properties);
  } catch {
    // PostHog not initialized — silently ignore
  }
}

/** Identify user for analytics */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(userId, traits);
    Sentry.setUser({ id: userId, ...traits });
  } catch {
    // Not initialized — silently ignore
  }
}

/** Capture error to Sentry with context */
export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

// Key product events
export const Events = {
  PROJECT_CREATED: "project_created",
  PROJECT_DUPLICATED: "project_duplicated",
  STEP_COMPLETED: "step_completed",
  STEP_NAVIGATED: "step_navigated",
  SIMULATION_RUN: "simulation_run",
  GDD_EXPORTED: "gdd_exported",
  AI_REVIEW_REQUESTED: "ai_review_requested",
  AI_CONCEPT_GENERATED: "ai_concept_generated",
  SAMPLE_PROJECT_CREATED: "sample_project_created",
  PROTOTYPE_SPIN: "prototype_spin",
} as const;
