"use client";

import type { PortfolioAnalytics } from "@/lib/api";

const VOLATILITY_LABELS: Record<string, string> = {
  low: "Low",
  med_low: "Med-Low",
  medium: "Medium",
  med_high: "Med-High",
  high: "High",
};

interface Props {
  analytics: PortfolioAnalytics;
}

export function PortfolioAnalyticsPanel({ analytics }: Props) {
  const topThemes = Object.entries(analytics.theme_distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const topFeatures = Object.entries(analytics.feature_popularity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total + Avg RTP */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Portfolio</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.total_games} games</p>
        <p className="mt-1 text-xs text-gray-400">
          Avg RTP: {analytics.avg_rtp ? `${analytics.avg_rtp.toFixed(1)}%` : "—"}
          {analytics.rtp_range.min > 0 && (
            <span className="ml-1">({analytics.rtp_range.min.toFixed(1)}–{analytics.rtp_range.max.toFixed(1)}%)</span>
          )}
        </p>
      </div>

      {/* Volatility spread */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Volatility Spread</p>
        <div className="mt-3 space-y-1.5">
          {Object.entries(analytics.volatility_distribution).length > 0 ? (
            Object.entries(analytics.volatility_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([vol, count]) => (
                <div key={vol} className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full bg-blue-400"
                    style={{ width: `${(count / analytics.total_games) * 100}%`, minWidth: 8 }}
                  />
                  <span className="text-xs text-gray-600">
                    {VOLATILITY_LABELS[vol] ?? vol} ({count})
                  </span>
                </div>
              ))
          ) : (
            <p className="text-xs text-gray-400">No data</p>
          )}
        </div>
      </div>

      {/* Theme distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top Themes</p>
        <div className="mt-3 space-y-1.5">
          {topThemes.length > 0 ? (
            topThemes.map(([theme, count]) => (
              <div key={theme} className="flex items-center justify-between">
                <span className="text-xs text-gray-700 capitalize">{theme}</span>
                <span className="text-xs font-medium text-gray-500">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400">No themes set</p>
          )}
        </div>
      </div>

      {/* Feature popularity */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Feature Popularity</p>
        <div className="mt-3 space-y-1.5">
          {topFeatures.length > 0 ? (
            topFeatures.map(([feat, count]) => (
              <div key={feat} className="flex items-center gap-2">
                <div
                  className="h-2 rounded-full bg-green-400"
                  style={{ width: `${(count / analytics.total_games) * 100}%`, minWidth: 8 }}
                />
                <span className="text-xs text-gray-600">
                  {feat.replace(/_/g, " ")} ({Math.round((count / analytics.total_games) * 100)}%)
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400">No features tracked</p>
          )}
        </div>
      </div>
    </div>
  );
}
