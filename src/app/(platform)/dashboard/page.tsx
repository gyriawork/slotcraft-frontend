"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Onboarding } from "@/components/onboarding";
import { VOLATILITY_LABELS, TYPE_GRADIENTS, TYPE_LETTER, STEP_NAMES } from "@/lib/constants";

/* ─── types ───────────────────────────────────────────────────────── */

interface DashboardProject {
  id: string;
  name: string;
  game_type: "slot" | "crash" | "table";
  brand: string;
  team: string;
  created_by: string;
  current_step: number;
  total_steps: number;
  status: "active" | "complete" | "draft" | "blocked";
  target_rtp: number | null;
  volatility: string | null;
  sim_status: "passed" | "failed" | "running" | "not_run";
  verified_rtp: number | null;
  sim_started_at: string | null;
  icons_uploaded: number;
  icons_total: number;
  product_sheet_status: "ready" | "draft" | "missing";
  target_release_date: string | null;
  last_updated_at: string;
  last_updated_by: string;
  created_at: string;
  completed_at: string | null;
  next_action: string;
  days_until_release: number | null;
  days_since_last_update: number;
  stale_steps: number[];
}

interface ActivityEvent {
  id: string;
  project_id: string;
  project_name: string;
  user_name: string;
  action: string;
  detail: string;
  created_at: string;
}

interface Alert {
  type: "error" | "warning" | "info";
  title: string;
  text: string;
  time: string | null;
  link: string;
}

/* ─── helpers ─────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function daysBetween(a: string | Date, b: string | Date): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

const ACTIVITY_COLORS: Record<string, string> = {
  sim_completed: "var(--green)",
  sim_failed: "#ef6060",
  step_completed: "var(--accent)",
  asset_uploaded: "var(--accent)",
  export_generated: "var(--green)",
  status_changed: "var(--green)",
  sim_started: "var(--amber)",
  comment_added: "#3b82f6",
};

const TEAM_CAPACITY = 3;

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(124,107,245,0.15)", text: "#a78bfa", label: "Active" },
  complete: { bg: "rgba(61,214,140,0.15)", text: "#3dd68c", label: "Complete" },
  draft: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af", label: "Draft" },
  blocked: { bg: "rgba(239,96,96,0.15)", text: "#ef6060", label: "Blocked" },
};

const PIPELINE_COLORS: Record<number, string> = {
  1: "#7c6bf5", 2: "#6558e0", 3: "#8b5cf6", 4: "#a78bfa",
  5: "#50a0f0", 6: "#3b82f6", 7: "#10b981", 8: "#059669",
  9: "#06b6d4",
};

/* ─── component ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const data = await res.json();
      setProjects(data.projects);
      setActivity(data.recentActivity);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  /* ─── computed stats ────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    released: projects.filter((p) => p.status === "complete").length,
    drafts: projects.filter((p) => p.status === "draft").length,
    blocked: projects.filter((p) => p.status === "blocked").length,
    newThisMonth: projects.filter((p) => isThisMonth(p.created_at)).length,
  }), [projects]);

  /* ─── pipeline ──────────────────────────────────────────────────── */
  const pipeline = useMemo(() => {
    const steps: Record<number, number> = {};
    for (let s = 1; s <= 9; s++) steps[s] = 0;
    steps[10] = 0; // "Released"
    projects.forEach((p) => {
      if (p.status === "complete") steps[10]++;
      else steps[p.current_step] = (steps[p.current_step] ?? 0) + 1;
    });
    return steps;
  }, [projects]);

  const pipelineMetrics = useMemo(() => {
    const completed = projects.filter((p) => p.status === "complete" && p.completed_at && p.created_at);
    const avgWeeks = completed.length > 0
      ? completed.reduce((sum, p) => sum + daysBetween(p.created_at, p.completed_at!) / 7, 0) / completed.length
      : null;
    let fastest: { name: string; weeks: number } | null = null;
    for (const p of completed) {
      const weeks = daysBetween(p.created_at, p.completed_at!) / 7;
      if (!fastest || weeks < fastest.weeks) fastest = { name: p.name, weeks };
    }
    return { avgWeeks, fastest };
  }, [projects]);

  /* ─── alerts ────────────────────────────────────────────────────── */
  const alerts = useMemo(() => {
    const items: Alert[] = [];
    projects.forEach((p) => {
      if (p.sim_status === "failed") {
        items.push({
          type: "error", title: p.name,
          text: `Simulation failed. RTP ${p.verified_rtp?.toFixed(2)}% vs target ${p.target_rtp}%`,
          time: p.last_updated_at, link: `/games/${p.id}?step=6`,
        });
      }
      if (p.status !== "complete" && p.days_since_last_update >= 14) {
        items.push({
          type: "warning", title: p.name,
          text: `Stuck at Step ${p.current_step} for ${p.days_since_last_update} days. No activity.`,
          time: p.last_updated_at, link: `/games/${p.id}?step=${p.current_step}`,
        });
      }
      if (p.stale_steps.length > 0) {
        items.push({
          type: "warning", title: p.name,
          text: `Steps ${p.stale_steps.join(", ")} are stale and need review.`,
          time: p.last_updated_at, link: `/games/${p.id}?step=${p.stale_steps[0]}`,
        });
      }
      if (p.days_until_release !== null && p.days_until_release <= 30
          && p.icons_uploaded === 0 && p.product_sheet_status === "missing") {
        items.push({
          type: "info", title: p.name,
          text: `Release in ${p.days_until_release} days, marketing assets 0% complete.`,
          time: null, link: `/games/${p.id}?step=9`,
        });
      }
    });
    items.sort((a, b) => {
      const pr = { error: 0, warning: 1, info: 2 };
      return pr[a.type] - pr[b.type];
    });
    return items.slice(0, 5);
  }, [projects]);

  /* ─── team workload ─────────────────────────────────────────────── */
  const teamWorkload = useMemo(() => {
    const teams: Record<string, { name: string; lead: string; games: number; active: number; blocked: number }> = {};
    projects.forEach((p) => {
      if (!teams[p.team]) teams[p.team] = { name: p.team, lead: p.created_by, games: 0, active: 0, blocked: 0 };
      teams[p.team].games++;
      if (p.status === "active") teams[p.team].active++;
      if (p.status === "blocked") teams[p.team].blocked++;
    });
    return Object.values(teams).map((t) => ({
      ...t,
      utilization: Math.round(((t.active + t.blocked) / TEAM_CAPACITY) * 100),
      utilizationColor: (t.active + t.blocked) / TEAM_CAPACITY > 0.9 ? "#ef6060"
        : (t.active + t.blocked) / TEAM_CAPACITY > 0.75 ? "#f0b040" : "var(--accent)",
    }));
  }, [projects]);

  const overallUtilization = useMemo(() => {
    if (teamWorkload.length === 0) return 0;
    return Math.round(teamWorkload.reduce((s, t) => s + t.utilization, 0) / teamWorkload.length);
  }, [teamWorkload]);

  const capacityWarning = useMemo(() => {
    const overloaded = teamWorkload.filter((t) => t.utilization >= 85);
    if (overloaded.length === 0) return null;
    return `${overloaded[0].name} near capacity — redistribute or delay`;
  }, [teamWorkload]);

  /* ─── upcoming releases ─────────────────────────────────────────── */
  const upcomingReleases = useMemo(() => {
    return projects
      .filter((p) => p.target_release_date && p.status !== "complete")
      .map((p) => ({
        ...p,
        days_until: p.days_until_release ?? 999,
        countdownColor: (p.days_until_release ?? 999) <= 21 ? "#ef6060"
          : (p.days_until_release ?? 999) <= 60 ? "#3dd68c" : "var(--text4)",
      }))
      .sort((a, b) => a.days_until - b.days_until)
      .slice(0, 5);
  }, [projects]);

  /* ─── simulation status ─────────────────────────────────────────── */
  const simRows = useMemo(() => {
    return projects
      .filter((p) => p.status !== "draft")
      .map((p) => ({
        name: p.name,
        rtp: p.verified_rtp,
        target_rtp: p.target_rtp,
        status: p.sim_status,
        statusColor: p.sim_status === "passed" ? "#3dd68c"
          : p.sim_status === "failed" ? "#ef6060"
          : p.sim_status === "running" ? "#f0b040" : "var(--text4)",
      }))
      .sort((a, b) => {
        const ord = { failed: 0, running: 1, passed: 2, not_run: 3 };
        return (ord[a.status] ?? 4) - (ord[b.status] ?? 4);
      });
  }, [projects]);

  const simSummary = useMemo(() => ({
    passed: simRows.filter((s) => s.status === "passed").length,
    failed: simRows.filter((s) => s.status === "failed").length,
    running: simRows.filter((s) => s.status === "running").length,
    pending: simRows.filter((s) => s.status === "not_run").length,
  }), [simRows]);

  /* ─── marketing readiness ───────────────────────────────────────── */
  const marketingRows = useMemo(() => {
    return projects
      .filter((p) => p.status === "active" || p.status === "complete")
      .map((p) => {
        const color = (p.icons_uploaded === p.icons_total && p.product_sheet_status === "ready") ? "#3dd68c"
          : (p.icons_uploaded > 0 || p.product_sheet_status === "draft") ? "#f0b040" : "#ef6060";
        const displayText = (p.icons_uploaded === p.icons_total && p.product_sheet_status === "ready")
          ? `${p.icons_uploaded}/${p.icons_total} icons · sheet ready`
          : p.product_sheet_status === "draft"
          ? `${p.icons_uploaded}/${p.icons_total} icons · sheet draft`
          : `${p.icons_uploaded}/${p.icons_total} icons · no sheet`;
        return { name: p.name, color, displayText };
      })
      .sort((a, b) => {
        const ord: Record<string, number> = { "#ef6060": 0, "#f0b040": 1, "#3dd68c": 2 };
        return (ord[a.color] ?? 3) - (ord[b.color] ?? 3);
      });
  }, [projects]);

  const marketingSummary = useMemo(() => ({
    complete: marketingRows.filter((m) => m.color === "#3dd68c").length,
    inProgress: marketingRows.filter((m) => m.color === "#f0b040").length,
    notStarted: marketingRows.filter((m) => m.color === "#ef6060").length,
  }), [marketingRows]);

  /* ─── render ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6" style={{ background: "var(--bg)" }}>
        <div className="rounded-lg p-4 text-[12px]" style={{ background: "rgba(239,96,96,0.1)", color: "#ef6060", border: "1px solid rgba(239,96,96,0.2)" }}>
          <p>{error}</p>
          <button onClick={fetchDashboard} className="mt-1 text-[11px] underline">Retry</button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg)" }}>
        <Onboarding onDismiss={fetchDashboard} />
      </div>
    );
  }

  const totalSteps = projects[0]?.total_steps ?? 9;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-[1440px] px-6 py-6">
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-semibold" style={{ color: "var(--text)" }}>Welcome back</h2>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--text2)" }}>Overview of your game design portfolio</p>
          </div>
          <Link href="/games/new" className="rounded-md px-4 py-[7px] text-[12px] font-medium"
            style={{ background: "var(--accent-soft)", border: "0.5px solid var(--accent-border)", color: "var(--accent)" }}>
            + New project
          </Link>
        </div>

        {/* ─── 1. Stats row (5 cards) ──────────────────────────── */}
        <div className="mb-5 grid gap-3 grid-cols-5">
          <StatCard value={stats.total} label="Total Games" sub={stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : undefined} />
          <StatCard value={stats.active} label="Active" color="var(--accent)" />
          <StatCard value={stats.released} label="Released" color="#3dd68c" />
          <StatCard value={stats.drafts} label="Drafts" />
          <StatCard value={stats.blocked} label="Blocked" color="#ef6060"
            sub={stats.blocked > 0 ? "sim failed" : undefined} subColor="#ef6060" />
        </div>

        {/* ─── 2. Production pipeline + 3. Needs attention ─────── */}
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          {/* Pipeline (2/3 width) */}
          <div className="lg:col-span-2 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>Production Pipeline</p>
              <div className="flex gap-3 text-[10px]" style={{ color: "var(--text4)" }}>
                {pipelineMetrics.avgWeeks !== null && <span>Avg: {pipelineMetrics.avgWeeks.toFixed(1)} weeks</span>}
                {pipelineMetrics.fastest && <span>Fastest: {pipelineMetrics.fastest.weeks.toFixed(1)}w ({pipelineMetrics.fastest.name.split(" ")[0]})</span>}
              </div>
            </div>
            {/* Segmented bar */}
            <div className="flex h-8 rounded-lg overflow-hidden mb-3">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
                const count = pipeline[step] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={step} className="flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{ flex: count, background: PIPELINE_COLORS[step] ?? "var(--accent)", minWidth: count > 0 ? 24 : 0 }}
                    title={`Step ${step}: ${STEP_NAMES[step] ?? step} (${count})`}>
                    {count}
                  </div>
                );
              })}
              {(pipeline[10] ?? 0) > 0 && (
                <div className="flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ flex: pipeline[10], background: "#3dd68c", minWidth: 24 }}>
                  {pipeline[10]}
                </div>
              )}
            </div>
            {/* Step labels */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ background: PIPELINE_COLORS[step] ?? "var(--accent)" }} />
                  <span className="text-[9px]" style={{ color: "var(--text4)" }}>{STEP_NAMES[step] ?? `Step ${step}`}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: "#3dd68c" }} />
                <span className="text-[9px]" style={{ color: "var(--text4)" }}>Released</span>
              </div>
            </div>
          </div>

          {/* Needs attention (1/3) */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text3)" }}>Needs Attention</p>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <Link key={i} href={a.link} className="block rounded-lg p-2.5 transition-colors"
                    style={{ background: a.type === "error" ? "rgba(239,96,96,0.08)" : a.type === "warning" ? "rgba(240,176,64,0.08)" : "rgba(124,107,245,0.08)" }}>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: a.type === "error" ? "#ef6060" : a.type === "warning" ? "#f0b040" : "var(--accent)" }} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>{a.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>{a.text}</p>
                        {a.time && <p className="text-[9px] mt-0.5" style={{ color: "var(--text4)" }}>{relativeTime(a.time)}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[11px] py-4 text-center" style={{ color: "var(--text4)" }}>All clear</p>
            )}
          </div>
        </div>

        {/* ─── Row 3: Team workload + Upcoming releases ────────── */}
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          {/* Team workload */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>Team Workload</p>
              <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>{overallUtilization}% overall</span>
            </div>
            <div className="space-y-3">
              {teamWorkload.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{t.name}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: "var(--text4)" }}>{t.lead}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text4)" }}>
                      <span>{t.games} games</span>
                      <span>{t.active} active</span>
                      {t.blocked > 0 && <span style={{ color: "#ef6060" }}>{t.blocked} blocked</span>}
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, t.utilization)}%`, background: t.utilizationColor }} />
                  </div>
                  <p className="text-[9px] mt-0.5 text-right" style={{ color: t.utilizationColor }}>{t.utilization}%</p>
                </div>
              ))}
            </div>
            {capacityWarning && (
              <p className="mt-2 text-[10px] rounded px-2 py-1" style={{ background: "rgba(240,176,64,0.1)", color: "#f0b040" }}>{capacityWarning}</p>
            )}
          </div>

          {/* Upcoming releases */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text3)" }}>Upcoming Releases</p>
            {upcomingReleases.length > 0 ? (
              <div className="space-y-2">
                {upcomingReleases.map((r) => (
                  <Link key={r.id} href={`/games/${r.id}`} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors"
                    style={{ background: "var(--bg)" }}>
                    <TypeIcon type={r.game_type} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>{r.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text4)" }}>Step {r.current_step}/{totalSteps} · {r.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold" style={{ color: r.countdownColor }}>{r.days_until}d</p>
                      <p className="text-[9px]" style={{ color: "var(--text4)" }}>
                        {r.target_release_date ? new Date(r.target_release_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[11px] py-4 text-center" style={{ color: "var(--text4)" }}>No upcoming releases</p>
            )}
          </div>
        </div>

        {/* ─── Row 4: Simulation status + Recent activity ──────── */}
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          {/* Simulation status */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>Simulation Status</p>
              <div className="flex gap-2 text-[10px]">
                <span style={{ color: "#3dd68c" }}>{simSummary.passed} passed</span>
                <span style={{ color: "#ef6060" }}>{simSummary.failed} failed</span>
                {simSummary.running > 0 && <span style={{ color: "#f0b040" }}>{simSummary.running} running</span>}
                <span style={{ color: "var(--text4)" }}>{simSummary.pending} pending</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {simRows.map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.statusColor }} />
                  <span className="text-[11px] flex-1 truncate" style={{ color: "var(--text)" }}>{s.name}</span>
                  <span className="text-[11px] font-mono w-16 text-right" style={{ color: s.statusColor }}>
                    {s.rtp != null ? `${s.rtp.toFixed(2)}%` : "—"}
                  </span>
                  <span className="text-[10px] w-14 text-right capitalize" style={{ color: s.statusColor }}>
                    {s.status === "not_run" ? "—" : s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text3)" }}>Recent Activity</p>
            <div className="space-y-2">
              {activity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: ACTIVITY_COLORS[a.action] ?? "var(--text4)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px]" style={{ color: "var(--text)" }}>
                      <span className="font-medium">{a.user_name}</span>{" "}
                      <span style={{ color: "var(--text3)" }}>{a.detail}</span>
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text4)" }}>
                      {a.project_name} · {relativeTime(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Row 5: Marketing readiness ──────────────────────── */}
        <div className="mb-5 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>Marketing Readiness</p>
            <div className="flex gap-2 text-[10px]">
              <span style={{ color: "#3dd68c" }}>{marketingSummary.complete} complete</span>
              <span style={{ color: "#f0b040" }}>{marketingSummary.inProgress} in progress</span>
              <span style={{ color: "#ef6060" }}>{marketingSummary.notStarted} not started</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {marketingRows.map((m) => (
              <div key={m.name} className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: "var(--bg)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                <span className="text-[11px] font-medium truncate flex-1" style={{ color: "var(--text)" }}>{m.name}</span>
                <span className="text-[10px] whitespace-nowrap" style={{ color: m.color }}>{m.displayText}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Row 6: All games table ──────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="p-4" style={{ background: "var(--surface)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>All Games</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  {["Game", "Type", "Team", "RTP", "Progress", "Sim", "Release", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text4)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p, idx) => {
                  const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
                  const progressPct = (p.current_step / totalSteps) * 100;
                  const progressColor = p.status === "complete" ? "#3dd68c"
                    : p.status === "blocked" ? "#ef6060"
                    : p.status === "draft" ? "#f0b040" : "var(--accent)";
                  const displayRtp = p.verified_rtp ?? p.target_rtp;
                  const rtpColor = p.sim_status === "passed" ? "#3dd68c"
                    : p.sim_status === "failed" ? "#ef6060"
                    : p.sim_status === "running" ? "#f0b040" : "var(--text4)";
                  const simLabel = p.sim_status === "not_run" ? "—" : p.sim_status;
                  const simColor = rtpColor;

                  return (
                    <tr key={p.id} className="transition-colors"
                      style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--bg)" }}>
                      <td className="px-4 py-2.5">
                        <Link href={`/games/${p.id}`} className="flex items-center gap-2 hover:underline">
                          <TypeIcon type={p.game_type} size={24} />
                          <span className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>{p.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-[11px]" style={{ color: "var(--text4)" }}>{p.game_type}</td>
                      <td className="px-4 py-2.5 text-[11px]" style={{ color: "var(--text4)" }}>{p.team}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono" style={{ color: rtpColor }}>
                        {displayRtp != null ? `${displayRtp.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: progressColor }} />
                          </div>
                          <span className="text-[10px] w-8" style={{ color: "var(--text4)" }}>{p.current_step}/{totalSteps}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] capitalize" style={{ color: simColor }}>{simLabel}</td>
                      <td className="px-4 py-2.5 text-[10px]" style={{ color: "var(--text4)" }}>
                        {p.target_release_date ? new Date(p.target_release_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StatCard({ value, label, color, sub, subColor }: {
  value: number; label: string; color?: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-2xl font-bold" style={{ color: color || "var(--text)" }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>{label}</div>
      {sub && <div className="text-[10px] mt-1" style={{ color: subColor ?? "var(--text4)" }}>{sub}</div>}
    </div>
  );
}

function TypeIcon({ type, size = 28 }: { type: string; size?: number }) {
  return (
    <div className="flex items-center justify-center rounded-md font-bold text-white"
      style={{ width: size, height: size, background: TYPE_GRADIENTS[type] ?? "#6b7280", fontSize: size * 0.45 }}>
      {TYPE_LETTER[type] ?? "?"}
    </div>
  );
}
