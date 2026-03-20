"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { GanttChart } from "@/components/roadmap/gantt-chart";
import { RoadmapList } from "@/components/roadmap/roadmap-list";
import {
  SAMPLE_ROADMAP_GAMES,
  mergeToRoadmap,
  type GameType,
  type RoadmapGame,
} from "@/components/roadmap/roadmap-types";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

const TYPE_FILTERS: Array<{ key: GameType; label: string; cls: string }> = [
  { key: "slot", label: "Slots", cls: "slot" },
  { key: "crash", label: "Crash", cls: "crash" },
  { key: "table", label: "Table", cls: "table" },
];

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "dev", label: "In dev" },
  { key: "concept", label: "Concept" },
  { key: "released", label: "Released" },
];

export default function RoadmapPage() {
  const [year, setYear] = useState(currentYear);
  // Single view: Gantt on top + List by quarter below
  const [activeTypes, setActiveTypes] = useState<Set<GameType>>(new Set(["slot", "crash", "table"]));
  const [activeTeams, setActiveTeams] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [allGames, setAllGames] = useState<RoadmapGame[]>(SAMPLE_ROADMAP_GAMES);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "sample">("sample");

  const currentMonth = new Date().getMonth();

  // Fetch real data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [libraryGames, projects] = await Promise.all([
        api.library.list(),
        api.projects.list(),
      ]);

      const merged = mergeToRoadmap(libraryGames, projects);

      if (merged.length > 0) {
        setAllGames(merged);
        setDataSource("api");
      } else {
        // No real data — keep sample data
        setAllGames(SAMPLE_ROADMAP_GAMES);
        setDataSource("sample");
      }
    } catch {
      // Backend unavailable — use sample data
      setAllGames(SAMPLE_ROADMAP_GAMES);
      setDataSource("sample");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive unique teams from data
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    for (const g of allGames) {
      if (g.team && g.team !== "\u2014") teams.add(g.team);
    }
    return Array.from(teams).sort();
  }, [allGames]);

  // Initialize team filters when data loads
  useEffect(() => {
    if (allTeams.length > 0) {
      setActiveTeams(new Set(allTeams));
    }
  }, [allTeams]);

  const toggleType = (type: GameType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleTeam = (team: string) => {
    setActiveTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  };

  // Filter games
  const filtered = useMemo(() => {
    return allGames.filter((g) => {
      if (!activeTypes.has(g.type)) return false;
      if (allTeams.length > 0 && g.team !== "\u2014" && !activeTeams.has(g.team)) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (g.year && g.year !== year) return false;
      return true;
    });
  }, [allGames, activeTypes, activeTeams, allTeams, statusFilter, year]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const released = filtered.filter((g) => g.status === "released").length;
    const dev = filtered.filter((g) => g.status === "dev" || g.status === "qa").length;
    const concept = filtered.filter((g) => g.status === "concept").length;
    return { total, released, dev, concept };
  }, [filtered]);

  // Type counts for filter labels
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of allGames) {
      counts[g.type] = (counts[g.type] ?? 0) + 1;
    }
    return counts;
  }, [allGames]);

  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of allGames) {
      if (g.team && g.team !== "\u2014") {
        counts[g.team] = (counts[g.team] ?? 0) + 1;
      }
    }
    return counts;
  }, [allGames]);

  return (
      <div className="flex-1 overflow-y-auto p-5" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-[1100px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-[20px] font-semibold" style={{ color: "var(--text)" }}>
                Games road map
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text2)" }}>
                Release plan for {year} — {stats.total} games
                {allTeams.length > 0 ? ` across ${allTeams.length} teams` : ""}
              </p>
            </div>
            {dataSource === "sample" && !loading && (
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px]"
                style={{ background: "var(--amber-soft)", borderColor: "var(--amber-border)", color: "var(--amber)" }}
              >
                Sample data — connect backend to see real games
              </div>
            )}
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[14px] font-semibold mr-1" style={{ color: "var(--text)" }}>Year:</span>
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className="rounded-md border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  borderColor: y === year ? "var(--accent-border)" : "var(--border)",
                  background: y === year ? "var(--accent-soft)" : "transparent",
                  color: y === year ? "var(--accent)" : "var(--text3)",
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-2.5 mb-4">
            <StatCard value={stats.total} label="Total games planned" />
            <StatCard value={stats.released} label="Released" valueColor="var(--green)" />
            <StatCard value={stats.dev} label="In development" valueColor="var(--accent)" />
            <StatCard value={stats.concept} label="Concept / planned" valueColor="var(--text3)" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              Type:
            </span>
            {TYPE_FILTERS.map((tf) => (
              <FilterChip
                key={tf.key}
                active={activeTypes.has(tf.key)}
                onClick={() => toggleType(tf.key)}
                variant={tf.cls}
              >
                {tf.label} ({typeCounts[tf.key] ?? 0})
              </FilterChip>
            ))}

            {allTeams.length > 0 && (
              <>
                <div className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                  Team:
                </span>
                {allTeams.map((team) => (
                  <FilterChip
                    key={team}
                    active={activeTeams.has(team)}
                    onClick={() => toggleTeam(team)}
                    variant={`team-${team.toLowerCase()}`}
                  >
                    {team} ({teamCounts[team] ?? 0})
                  </FilterChip>
                ))}
              </>
            )}

            <div className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />

            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              Status:
            </span>
            {STATUS_FILTERS.map((sf) => (
              <FilterChip
                key={sf.key}
                active={statusFilter === sf.key}
                onClick={() => setStatusFilter(sf.key)}
                variant="status"
              >
                {sf.label}
              </FilterChip>
            ))}
          </div>

          {/* Count */}
          <div className="flex items-center justify-end mb-3">
            <div className="text-[11px]" style={{ color: "var(--text3)" }}>
              Showing {filtered.length} of {allGames.length} games
            </div>
          </div>

          {/* Views: Gantt on top, List by quarter below */}
          {loading ? (
            <div
              className="flex items-center justify-center rounded-xl border py-20"
              style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
            >
              <span className="text-[13px]" style={{ color: "var(--text3)" }}>Loading roadmap...</span>
            </div>
          ) : (
            <>
              <GanttChart games={filtered} currentMonth={currentMonth} />
              <div className="mt-6">
                <h2 className="text-[15px] font-semibold mb-3" style={{ color: "var(--text)" }}>By Quarter</h2>
                <RoadmapList games={filtered} year={year} />
              </div>
            </>
          )}
        </div>
      </div>
  );
}

function StatCard({ value, label, valueColor }: { value: number; label: string; valueColor?: string }) {
  return (
    <div
      className="flex-1 rounded-lg border px-4 py-3 text-center"
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
    >
      <div className="text-[22px] font-semibold" style={{ color: valueColor ?? "var(--text)" }}>
        {value}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>
        {label}
      </div>
    </div>
  );
}

const FILTER_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  slot: { bg: "var(--accent-soft)", border: "var(--accent-border)", color: "var(--accent)" },
  crash: { bg: "var(--amber-soft)", border: "var(--amber-border)", color: "var(--amber)" },
  table: { bg: "var(--teal-soft)", border: "var(--teal-border)", color: "var(--teal)" },
  "team-alpha": { bg: "var(--blue-soft)", border: "var(--blue-border)", color: "var(--blue)" },
  "team-beta": { bg: "var(--pink-soft)", border: "var(--pink-border)", color: "var(--pink)" },
  "team-gamma": { bg: "var(--green-soft)", border: "var(--green-border)", color: "var(--green)" },
  status: { bg: "var(--bg3)", border: "var(--border-h)", color: "var(--text)" },
};

function FilterChip({
  children,
  active,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant: string;
}) {
  const colors = FILTER_COLORS[variant] ?? FILTER_COLORS.status;
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border px-3 py-1 text-[12px] transition-colors"
      style={{
        borderColor: active ? colors.border : "var(--border)",
        background: active ? colors.bg : "transparent",
        color: active ? colors.color : "var(--text2)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {children}
    </button>
  );
}

