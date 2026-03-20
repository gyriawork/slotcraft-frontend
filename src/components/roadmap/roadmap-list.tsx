"use client";

import {
  MONTHS,
  getQuarter,
  TYPE_CONFIG,
  STATUS_CONFIG,
  TEAM_CONFIG,
  type RoadmapGame,
} from "./roadmap-types";

interface RoadmapListProps {
  games: RoadmapGame[];
  year: number;
}

export function RoadmapList({ games, year }: RoadmapListProps) {
  // Group games by quarter → month (based on marketing release)
  const quarterGroups: Record<string, Record<string, RoadmapGame[]>> = {
    Q1: {}, Q2: {}, Q3: {}, Q4: {},
  };

  for (const game of games) {
    const monthIdx = Math.min(11, Math.floor(game.marketingReleaseMonth));
    const q = getQuarter(monthIdx);
    const monthName = MONTHS[monthIdx];
    if (!quarterGroups[q][monthName]) quarterGroups[q][monthName] = [];
    quarterGroups[q][monthName].push(game);
  }

  const currentMonth = new Date().getMonth();

  return (
    <div>
      {["Q1", "Q2", "Q3", "Q4"].map((q) => {
        const months = quarterGroups[q];
        const gameCount = Object.values(months).reduce((sum, arr) => sum + arr.length, 0);
        if (gameCount === 0) return null;

        return (
          <div key={q} className="mb-5">
            {/* Quarter header */}
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                {q} {year}
              </span>
              <span
                className="rounded-xl px-2.5 py-0.5 text-[12px]"
                style={{ background: "var(--bg3)", color: "var(--text3)" }}
              >
                {gameCount} game{gameCount !== 1 ? "s" : ""}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* Months */}
            {Object.entries(months).map(([monthName, monthGames]) => {
              const monthIdx = MONTHS.indexOf(monthName);
              const isCurrent = monthIdx === currentMonth;

              return (
                <div
                  key={monthName}
                  className="mb-3.5 pl-3 border-l-2"
                  style={{ borderColor: isCurrent ? "var(--accent)" : "var(--bg4)" }}
                >
                  <div
                    className="text-[12px] font-medium mb-2 py-0.5"
                    style={{ color: isCurrent ? "var(--accent)" : "var(--text3)" }}
                  >
                    {monthName} {year}
                  </div>

                  {monthGames.map((game) => {
                    const typeCfg = TYPE_CONFIG[game.type];
                    const statusCfg = STATUS_CONFIG[game.status];
                    const teamCfg = TEAM_CONFIG[game.team] ?? { bg: "var(--bg4)", color: "var(--text3)" };

                    return (
                      <div
                        key={game.name}
                        className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5 mb-1.5 cursor-pointer transition-colors"
                        style={{
                          background: "var(--bg2)",
                          borderColor: "var(--border)",
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-semibold text-white"
                          style={{ background: typeCfg.gradient }}
                        >
                          {typeCfg.iconLetter}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                            {game.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: "var(--text3)" }}>
                            <span
                              className="rounded-lg px-2 py-px text-[10px] font-medium"
                              style={{ background: typeCfg.badgeBg, color: typeCfg.badgeColor }}
                            >
                              {game.type}
                            </span>
                            <span style={{ color: "var(--border)", fontSize: "8px" }}>&middot;</span>
                            <span>{game.createdBy && game.createdBy !== "\u2014" ? game.createdBy : ""}</span>
                            <span style={{ color: "var(--border)", fontSize: "8px" }}>&middot;</span>
                            <span>{game.team !== "\u2014" ? game.team : ""}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="min-w-[70px] text-center">
                            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                              Tech release
                            </div>
                            <div className="text-[12px] font-medium mt-0.5" style={{ color: "var(--green)" }}>
                              {game.techDate}
                            </div>
                          </div>
                          <div className="h-6 w-px" style={{ background: "var(--border)" }} />
                          <div className="min-w-[70px] text-center">
                            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                              Marketing
                            </div>
                            <div className="text-[12px] font-medium mt-0.5" style={{ color: "var(--amber)" }}>
                              {game.marketingDate}
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-medium"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Games are added automatically when dates are set in Projects */}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
