"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface ReviewResult {
  score: number;
  verdict: "excellent" | "good" | "needs_work" | "critical";
  strengths: string[];
  issues: string[];
  suggestions: string[];
}

interface Props {
  step: number;
  stepData: Record<string, unknown> | null | undefined;
  context?: Record<string, unknown>;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  excellent: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Excellent" },
  good: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Good" },
  needs_work: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Needs Work" },
  critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Critical" },
};

export function AiReview({ step, stepData, context }: Props) {
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  async function handleReview() {
    if (!stepData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.ai.review(step, stepData as Record<string, unknown>, context);
      setReview(result.review);
      setSource(result.source);
      setCollapsed(false);
      // Analytics
      import("@/lib/monitoring").then(({ trackEvent, Events }) =>
        trackEvent(Events.AI_REVIEW_REQUESTED, { step, source: result.source, score: result.review?.score })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  if (!stepData) return null;

  if (!review) {
    return (
      <button
        onClick={handleReview}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-purple-500 border-t-transparent" />
            Reviewing...
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI Review
          </>
        )}
      </button>
    );
  }

  const style = VERDICT_STYLES[review.verdict] ?? VERDICT_STYLES.good;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
        <button onClick={handleReview} className="ml-2 text-xs underline">Retry</button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${style.bg} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900">AI Review</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.text} ${style.bg}`}>
            {style.label} ({review.score}/10)
          </span>
          {source === "fallback" && (
            <span className="text-xs text-gray-400">(offline mode)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReview}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            {loading ? "..." : "Re-run"}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          {review.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-700">Strengths</p>
              <ul className="mt-1 space-y-0.5">
                {review.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="mt-0.5 text-green-500">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.issues.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700">Issues</p>
              <ul className="mt-1 space-y-0.5">
                {review.issues.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="mt-0.5 text-red-500">!</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-700">Suggestions</p>
              <ul className="mt-1 space-y-0.5">
                {review.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="mt-0.5 text-blue-500">&rarr;</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
