"use client";

import { MONTHS, TYPE_CONFIG, type RoadmapGame } from "./roadmap-types";

interface GanttChartProps {
  games: RoadmapGame[];
  currentMonth: number; // 0-based
}

export function GanttChart({ games, currentMonth }: GanttChartProps) {
  const quarters = ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2", "Q3", "Q3", "Q3", "Q4", "Q4", "Q4"];

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
    >
      {/* Header row */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-[220px] shrink-0 border-r px-3.5 py-2.5 text-[11px] font-medium"
          style={{ color: "var(--text3)", borderColor: "var(--border)" }}
        >
          Game
        </div>
        <div className="flex flex-1">
          {MONTHS.map((month, i) => (
            <div
              key={month}
              className="flex-1 border-r py-2 text-center text-[10px] font-medium"
              style={{
                color: i === currentMonth ? "var(--accent)" : "var(--text3)",
                background: i === currentMonth ? "var(--accent-soft)" : "transparent",
                borderColor: "var(--bg4)",
              }}
            >
              <span>{month}</span>
              <span
                className="block text-[9px] mt-0.5"
                style={{ color: "var(--text3)", opacity: 0.5 }}
              >
                {quarters[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[400px] overflow-y-auto">
        {games.map((game) => {
          const cfg = TYPE_CONFIG[game.type];
          const barLeft = (game.devStartMonth / 12) * 100;
          const barWidth = ((game.devEndMonth - game.devStartMonth) / 12) * 100;
          const techLeft = (game.techReleaseMonth / 12) * 100;
          const mktLeft = Math.min(99, (game.marketingReleaseMonth / 12) * 100);
          const todayLeft = ((currentMonth + 0.5) / 12) * 100;

          return (
            <div
              key={game.name}
              className="flex border-b transition-colors hover:opacity-90"
              style={{ borderColor: "var(--bg4)" }}
            >
              {/* Game label */}
              <div
                className="flex w-[220px] shrink-0 items-center gap-2 border-r px-3.5 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold text-white"
                  style={{ background: cfg.gradient }}
                >
                  {cfg.iconLetter}
                </div>
                <div className="min-w-0">
                  <div
                    className="truncate text-[12px] font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {game.name}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text3)" }}>
                    {game.team}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative flex flex-1 items-center" style={{ minHeight: 40 }}>
                {/* Month grid cells */}
                {MONTHS.map((_, i) => (
                  <div
                    key={i}
                    className="h-full flex-1 border-r"
                    style={{ borderColor: "var(--bg4)" }}
                  />
                ))}

                {/* Dev bar */}
                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full cursor-pointer transition-all hover:h-3"
                  style={{
                    left: `${barLeft}%`,
                    width: `${barWidth}%`,
                    background: "var(--accent)",
                    opacity: 0.7,
                    zIndex: 2,
                  }}
                  title={`${game.name}: Dev ${MONTHS[Math.floor(game.devStartMonth)]} → ${MONTHS[Math.min(11, Math.floor(game.devEndMonth))]}`}
                />

                {/* Tech release marker */}
                {game.techReleaseMonth <= 12 && (
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full cursor-pointer"
                    style={{
                      left: `${techLeft}%`,
                      background: "var(--green)",
                      border: "2px solid var(--bg2)",
                      zIndex: 3,
                    }}
                    title={`Tech release: ${game.techDate}`}
                  />
                )}

                {/* Marketing release marker */}
                {game.marketingReleaseMonth <= 12 && (
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full cursor-pointer"
                    style={{
                      left: `${mktLeft}%`,
                      background: "var(--amber)",
                      border: "2px solid var(--bg2)",
                      zIndex: 3,
                    }}
                    title={`Marketing release: ${game.marketingDate}`}
                  />
                )}

                {/* Today line */}
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: `${todayLeft}%`,
                    width: 1.5,
                    background: "var(--accent)",
                    opacity: 0.5,
                    zIndex: 4,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex gap-4 border-t px-3.5 py-2 text-[10px]"
        style={{ color: "var(--text3)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-[5px] w-5 rounded-full" style={{ background: "var(--accent)", opacity: 0.7 }} />
          Development period
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "var(--green)" }} />
          Tech release
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "var(--amber)" }} />
          Marketing release
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 1.5, height: 12, background: "var(--accent)", opacity: 0.5 }} />
          Today
        </div>
      </div>
    </div>
  );
}
