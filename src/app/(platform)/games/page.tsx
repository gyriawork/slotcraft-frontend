"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Project } from "@/lib/api";
import type { Step2Data, Step6Data } from "@/lib/wizard-types";
import {
  TOTAL_WIZARD_STEPS,
  STEP_NAMES,
  VOLATILITY_LABELS,
  TYPE_GRADIENTS,
  TYPE_LETTER as TYPE_LABEL,
  DATE_LABELS,
} from "@/lib/constants";

type ViewMode = "list" | "grid" | "table";
type SortMode = "updated" | "progress" | "release" | "name" | "rtp";

/* ── helpers ── */

function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = Math.abs(now - then);
  const suffix = then > now ? "from now" : "ago";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ${suffix}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ${suffix}`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ${suffix}`;
}

function getNextMilestone(project: Project): { label: string; date: string } | null {
  const now = new Date().toISOString().slice(0, 10);
  const dates = [
    { key: "development_start", date: project.development_start },
    { key: "development_end", date: project.development_end },
    { key: "tech_release", date: project.tech_release },
    { key: "pre_release", date: project.pre_release },
    { key: "marketing_release", date: project.marketing_release },
  ].filter((d): d is { key: string; date: string } => !!d.date);

  const future = dates.filter((d) => d.date >= now).sort((a, b) => a.date.localeCompare(b.date));
  if (future.length > 0) return { label: DATE_LABELS[future[0].key], date: future[0].date };

  const past = dates.sort((a, b) => b.date.localeCompare(a.date));
  if (past.length > 0) return { label: DATE_LABELS[past[0].key], date: past[0].date };

  return null;
}

function extractStepData(project: Project) {
  const sd = project.step_data ?? {};
  return {
    step2: sd.step2 as Step2Data | undefined,
    step6: sd.step6 as Step6Data | undefined,
  };
}

function getNextAction(project: Project): { text: string; isError: boolean } {
  const completed = project.completed_steps ?? 0;
  const step = project.current_step ?? 1;
  const sd = project.step_data ?? {};
  const step6 = sd.step6 as Step6Data | undefined;

  if (step6 && step6.rtp !== undefined && step6.rtp < 90) {
    return { text: `Fix math model — RTP ${step6.rtp.toFixed(1)}% out of range`, isError: true };
  }
  if (completed >= 8) return { text: "Ready for release", isError: false };
  if (completed >= 6 && !sd.step7) return { text: "Build prototype", isError: false };
  if (completed >= 5 && !step6) return { text: "Run 10M simulation", isError: false };
  return { text: `Complete Step ${step}: ${STEP_NAMES[step] ?? "Unknown"}`, isError: false };
}

function getSimStatus(project: Project): "passed" | "failed" | "not_run" {
  const sd = project.step_data ?? {};
  const step6 = sd.step6 as Step6Data | undefined;
  if (!step6) return "not_run";
  if (step6.rtp !== undefined && step6.rtp < 90) return "failed";
  return "passed";
}

function releaseDateClass(d: string | null | undefined): string {
  if (!d) return "none";
  const rd = new Date(d + "T00:00:00");
  const now = new Date();
  return rd < now ? "overdue" : "ontrack";
}

function sortProjects(list: Project[], sort: SortMode): Project[] {
  const sorted = [...list];
  switch (sort) {
    case "updated":
      return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    case "progress":
      return sorted.sort((a, b) => (b.completed_steps ?? 0) - (a.completed_steps ?? 0));
    case "release": {
      return sorted.sort((a, b) => {
        const ad = a.tech_release ?? a.marketing_release ?? "9999";
        const bd = b.tech_release ?? b.marketing_release ?? "9999";
        return ad.localeCompare(bd);
      });
    }
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "rtp": {
      const getRtp = (p: Project) => {
        const sd = p.step_data ?? {};
        const s6 = sd.step6 as Step6Data | undefined;
        const s2 = sd.step2 as Step2Data | undefined;
        return s6?.rtp ?? s2?.target_rtp ?? 0;
      };
      return sorted.sort((a, b) => getRtp(b) - getRtp(a));
    }
    default:
      return sorted;
  }
}

/* ── SVG icons for view toggle ── */

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="1" y1="3" x2="15" y2="3" /><line x1="1" y1="8" x2="15" y2="8" /><line x1="1" y1="13" x2="15" y2="13" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="14" height="14" rx="1.5" /><line x1="1" y1="5" x2="15" y2="5" />
      <line x1="1" y1="9" x2="15" y2="9" /><line x1="1" y1="13" x2="15" y2="13" /><line x1="6" y1="1" x2="6" y2="15" />
    </svg>
  );
}

const SIM_LABELS: Record<string, string> = { passed: "Passed", failed: "Failed", not_run: "Not run" };
const SIM_COLORS: Record<string, string> = { passed: "var(--green)", failed: "var(--red)", not_run: "var(--text4, #6a6a78)" };

/* ── component ── */

export default function GamesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"slot" | "crash" | "table">("slot");
  const [creating, setCreating] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [newDates, setNewDates] = useState<{ development_start: string; development_end: string; tech_release: string; pre_release: string; marketing_release: string }>({ development_start: "", development_end: "", tech_release: "", pre_release: "", marketing_release: "" });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "slot" | "crash" | "table">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<SortMode>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const created = await api.projects.create({
        name: newName.trim(),
        game_type: newType,
        development_start: newDates.development_start || null,
        development_end: newDates.development_end || null,
        tech_release: newDates.tech_release || null,
        pre_release: newDates.pre_release || null,
        marketing_release: newDates.marketing_release || null,
      });
      setNewName("");
      setNewDates({ development_start: "", development_end: "", tech_release: "", pre_release: "", marketing_release: "" });
      setShowDates(false);
      setShowCreate(false);
      router.push(`/games/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }, [newName, newType, newDates, creating, router]);

  const handleArchive = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await api.projects.archive(id);
        fetchProjects();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to archive");
      }
    },
    [fetchProjects]
  );

  const handleDuplicate = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const copy = await api.projects.duplicate(id);
        router.push(`/games/${copy.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to duplicate");
      }
    },
    [router]
  );

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /* ── derived data ── */
  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (filterType !== "all" && p.game_type !== filterType) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = sortProjects(list, sortBy);
    return list;
  }, [projects, filterType, filterStatus, search, sortBy]);

  const stats = useMemo(() => ({
    total: projects.length,
    complete: projects.filter((p) => (p.completed_steps ?? 0) >= TOTAL_WIZARD_STEPS).length,
    active: projects.filter((p) => p.status === "active" && (p.completed_steps ?? 0) < TOTAL_WIZARD_STEPS).length,
    draft: projects.filter((p) => p.status === "draft").length,
    archived: projects.filter((p) => p.status === "archived").length,
  }), [projects]);

  const totalSteps = TOTAL_WIZARD_STEPS;

  /* ── RENDER ── */
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-[20px] font-semibold" style={{ color: "var(--text)" }}>
            All projects
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text2)" }}>
            Manage your game design projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md px-4 py-[8px] text-[12px] font-semibold transition-colors"
          style={{ background: "var(--accent-soft)", border: "0.5px solid var(--accent-border)", color: "var(--accent)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.color = "var(--accent)"; }}
        >
          + New project
        </button>
      </div>

      {/* Stats bar */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total, colorClass: "" },
            { label: "Complete", value: stats.complete, color: "var(--green)" },
            { label: "Active", value: stats.active, color: "var(--accent)" },
            { label: "Draft", value: stats.draft, color: "var(--amber, #f0b040)" },
            { label: "Archived", value: stats.archived, color: "var(--red)" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[10px] border px-4 py-3 transition-colors"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="text-[22px] font-bold" style={{ color: s.color || "var(--text)" }}>{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters + Sort + View Toggle */}
      {!loading && projects.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border px-3 py-2 text-[13px] transition-colors focus:outline-none"
            style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="rounded-md border px-3 py-2 text-[12px]"
            style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="all">All Types</option>
            <option value="slot">Slot</option>
            <option value="crash">Crash</option>
            <option value="table">Table</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="rounded-md border px-3 py-2 text-[12px]"
            style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="rounded-md border px-3 py-2 text-[12px]"
            style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="updated">Sort: Last updated</option>
            <option value="progress">Sort: Progress</option>
            <option value="release">Sort: Release date</option>
            <option value="name">Sort: Name A-Z</option>
            <option value="rtp">Sort: RTP</option>
          </select>
          <div className="flex gap-0.5 ml-1">
            {([
              { mode: "list" as ViewMode, Icon: ListIcon },
              { mode: "grid" as ViewMode, Icon: GridIcon },
              { mode: "table" as ViewMode, Icon: TableIcon },
            ]).map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="w-[34px] h-[34px] rounded-md border flex items-center justify-center transition-colors"
                style={{
                  background: viewMode === mode ? "var(--accent-soft)" : "transparent",
                  borderColor: viewMode === mode ? "var(--accent-border)" : "var(--border)",
                  color: viewMode === mode ? "var(--accent)" : "var(--text3)",
                }}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div
          className="mb-5 rounded-lg border p-4"
          style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)" }}
        >
          <h3 className="text-[12px] font-semibold mb-3" style={{ color: "var(--text)" }}>
            Create New Project
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Game name"
              className="flex-1 rounded-md border px-3 py-2 text-[13px]"
              style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "slot" | "crash" | "table")}
              className="rounded-md border px-3 py-2 text-[12px]"
              style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <option value="slot">Slot</option>
              <option value="crash">Crash</option>
              <option value="table">Table</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="rounded-md px-4 py-2 text-[12px] font-medium border disabled:opacity-40"
              style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)", color: "var(--accent)" }}
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md px-3 py-2 text-[12px] border"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Cancel
            </button>
          </div>
          <button
            onClick={() => setShowDates(!showDates)}
            className="mt-2 text-[11px] flex items-center gap-1"
            style={{ color: "var(--accent)" }}
          >
            <span style={{ transform: showDates ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>&#9654;</span>
            Timeline dates (optional)
          </button>
          {showDates && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                ["development_start", "Dev start"],
                ["development_end", "Dev end"],
                ["tech_release", "Tech release"],
                ["pre_release", "Pre-release"],
                ["marketing_release", "Marketing release"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] mb-0.5" style={{ color: "var(--text3)" }}>{label}</label>
                  <input
                    type="date"
                    value={newDates[key]}
                    onChange={(e) => setNewDates((d) => ({ ...d, [key]: e.target.value }))}
                    className="w-full rounded-md border px-2.5 py-1.5 text-[12px]"
                    style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)", colorScheme: "dark" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-lg border p-3 text-[12px]"
          style={{ background: "var(--amber-soft)", borderColor: "var(--amber)", color: "var(--amber)" }}
        >
          <p>{error}</p>
          <button onClick={() => { setError(null); fetchProjects(); }} className="mt-1 text-[11px] underline">
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div
          className="rounded-[14px] border border-dashed p-12 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="text-[32px] opacity-50 mb-3">&#x2B21;</div>
          <h3 className="text-[15px] font-medium" style={{ color: "var(--text)" }}>No projects yet</h3>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text3)" }}>
            Create your first game to get started.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded-md px-4 py-2 text-[12px] font-medium border"
            style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)", color: "var(--accent)" }}
          >
            + New project
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && projects.length > 0 && (
        <p className="py-8 text-center text-[12px]" style={{ color: "var(--text3)" }}>
          No projects match your filters.
        </p>
      )}

      {/* ── LIST VIEW ── */}
      {!loading && filtered.length > 0 && viewMode === "list" && (
        <div className="flex flex-col gap-2">
          {filtered.map((project) => {
            const { step2, step6 } = extractStepData(project);
            const completed = project.completed_steps ?? 0;
            const pct = (completed / totalSteps) * 100;
            const meta = [
              project.game_type,
              step2?.volatility ? VOLATILITY_LABELS[step2.volatility] ?? step2.volatility : null,
              step6 ? `${step6.rtp.toFixed(1)}% RTP` : step2?.target_rtp ? `Target ${step2.target_rtp}%` : null,
            ].filter(Boolean).join(" \u00b7 ");
            const milestone = getNextMilestone(project);
            const nextAction = getNextAction(project);
            const sim = getSimStatus(project);
            const relCls = releaseDateClass(project.tech_release);
            const isSelected = selectedIds.has(project.id);

            return (
              <Link
                key={project.id}
                href={`/games/${project.id}`}
                className="group rounded-[14px] border px-5 py-4 block transition-colors"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  borderLeftWidth: isSelected ? "3px" : "0.5px",
                  borderLeftColor: isSelected ? "var(--accent)" : "var(--border)",
                }}
              >
                {/* Row 1: Identity + progress + status */}
                <div className="flex items-center gap-3.5">
                  {/* Checkbox */}
                  <div
                    className="w-5 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ opacity: selectedIds.size > 0 ? 1 : undefined }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      onClick={(e) => toggleSelect(project.id, e as unknown as React.MouseEvent)}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </div>
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-[14px] font-semibold text-white"
                    style={{ background: TYPE_GRADIENTS[project.game_type] ?? TYPE_GRADIENTS.slot }}
                  >
                    {TYPE_LABEL[project.game_type] ?? "G"}
                  </div>
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium" style={{ color: "var(--text)" }}>
                      {project.name}
                    </div>
                    <div className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text3)" }}>
                      {meta}
                    </div>
                  </div>
                  {/* Progress */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px]" style={{ color: "var(--text3)" }}>
                      Step {project.current_step ?? 1}/{totalSteps}
                    </span>
                    <div className="w-[80px] h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: completed >= totalSteps ? "var(--green)" : "var(--accent)",
                        }}
                      />
                    </div>
                  </div>
                  {/* Status badge */}
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ml-3"
                    style={{
                      background: completed >= totalSteps
                        ? "var(--green-soft)" : project.status === "active"
                        ? "var(--accent-soft)" : project.status === "archived"
                        ? "var(--red-soft)" : "var(--amber-soft)",
                      color: completed >= totalSteps
                        ? "var(--green)" : project.status === "active"
                        ? "var(--accent)" : project.status === "archived"
                        ? "var(--red)" : "var(--amber)",
                    }}
                  >
                    {completed >= totalSteps ? "Complete" : project.status === "active" ? "Active" : project.status === "archived" ? "Archived" : "Draft"}
                  </span>
                </div>

                {/* Row 2: Next action + date + sim + last updated */}
                <div className="flex items-center gap-5 mt-2.5 pl-[74px] text-[12px] flex-wrap" style={{ color: "var(--text3)" }}>
                  <span
                    className="max-w-[280px] truncate"
                    style={{ color: nextAction.isError ? "var(--red)" : "var(--text3)" }}
                  >
                    Next: {nextAction.text}
                  </span>
                  <span style={{ color: "var(--border)", fontSize: "10px" }}>|</span>
                  <span style={{
                    color: relCls === "overdue" ? "var(--red)" : relCls === "ontrack" ? "var(--green)" : "var(--text4, #6a6a78)"
                  }}>
                    {project.tech_release ? `Tech release: ${formatDate(project.tech_release)}` : "No release date"}
                  </span>
                  <span style={{ color: "var(--border)", fontSize: "10px" }}>|</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-[7px] h-[7px] rounded-full shrink-0"
                      style={{ background: SIM_COLORS[sim] }}
                    />
                    {SIM_LABELS[sim]}
                  </span>
                  <span className="ml-auto text-[11px]" style={{ color: "var(--text4, #6a6a78)" }}>
                    Updated {formatRelativeTime(project.updated_at)}
                  </span>
                </div>

                {/* Row 3: Milestone date if set */}
                {milestone && (
                  <div className="pl-[74px] mt-1">
                    <span className="text-[10px]" style={{ color: "var(--accent)" }}>
                      {milestone.label}: {formatDate(milestone.date)}
                    </span>
                  </div>
                )}

                {/* Row 4: Quick actions (hover) */}
                <div className="flex gap-1.5 mt-2.5 pl-[74px] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="px-3 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={{ color: "var(--accent)", border: "0.5px solid transparent" }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    Open
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(project.id, e)}
                    className="px-3 py-1 rounded-md text-[11px] transition-colors"
                    style={{ color: "var(--text3)", border: "0.5px solid transparent" }}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => handleArchive(project.id, e)}
                    className="px-3 py-1 rounded-md text-[11px] transition-colors"
                    style={{ color: "var(--red)", border: "0.5px solid transparent" }}
                  >
                    Archive
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((project) => {
            const { step2, step6 } = extractStepData(project);
            const completed = project.completed_steps ?? 0;
            const pct = (completed / totalSteps) * 100;
            const meta = [
              project.game_type,
              step6 ? `${step6.rtp.toFixed(1)}% RTP` : step2?.target_rtp ? `${step2.target_rtp}% RTP` : null,
            ].filter(Boolean).join(" \u00b7 ");

            return (
              <Link
                key={project.id}
                href={`/games/${project.id}`}
                className="rounded-[14px] border p-[18px] block transition-colors hover:border-[var(--border-hover,#3a3a44)]"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[13px] font-semibold text-white"
                    style={{ background: TYPE_GRADIENTS[project.game_type] ?? TYPE_GRADIENTS.slot }}
                  >
                    {TYPE_LABEL[project.game_type] ?? "G"}
                  </div>
                  <div className="flex-1 min-w-0 text-[14px] font-medium truncate" style={{ color: "var(--text)" }}>
                    {project.name}
                  </div>
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                    style={{
                      background: completed >= totalSteps
                        ? "var(--green-soft)" : project.status === "active"
                        ? "var(--accent-soft)" : project.status === "archived"
                        ? "var(--red-soft)" : "var(--amber-soft)",
                      color: completed >= totalSteps
                        ? "var(--green)" : project.status === "active"
                        ? "var(--accent)" : project.status === "archived"
                        ? "var(--red)" : "var(--amber)",
                    }}
                  >
                    {completed >= totalSteps ? "Complete" : project.status === "active" ? "Active" : project.status === "archived" ? "Archived" : "Draft"}
                  </span>
                </div>
                <div className="text-[11px] mb-2.5" style={{ color: "var(--text3)" }}>{meta}</div>
                <div className="text-[11px] mb-1" style={{ color: "var(--text3)" }}>Step {project.current_step ?? 1}/{totalSteps}</div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: completed >= totalSteps ? "var(--green)" : "var(--accent)",
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {!loading && filtered.length > 0 && viewMode === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {["Name", "Type", "RTP", "Vol", "Step", "Sim", "Release", "Updated", "Status"].map((col) => (
                  <th
                    key={col}
                    className="text-left px-3 py-2.5 font-semibold text-[11px] border-b whitespace-nowrap"
                    style={{ color: "var(--text3)", borderColor: "var(--border)", background: "var(--bg)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const { step2, step6 } = extractStepData(project);
                const completed = project.completed_steps ?? 0;
                const sim = getSimStatus(project);

                return (
                  <tr
                    key={project.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--surface)]"
                    onClick={() => router.push(`/games/${project.id}`)}
                    style={{ height: "44px" }}
                  >
                    <td className="px-3 py-2.5 font-medium border-b" style={{ color: "var(--text)", borderColor: "var(--border)" }}>
                      {project.name}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {project.game_type}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {step6 ? `${step6.rtp.toFixed(1)}%` : step2?.target_rtp ? `${step2.target_rtp}%` : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {step2?.volatility ? VOLATILITY_LABELS[step2.volatility] ?? step2.volatility : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {project.current_step ?? 1}/{totalSteps}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: SIM_COLORS[sim] }} />
                        <span style={{ color: "var(--text2)" }}>{SIM_LABELS[sim]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{
                      borderColor: "var(--border)",
                      color: releaseDateClass(project.tech_release) === "overdue" ? "var(--red)" :
                             releaseDateClass(project.tech_release) === "ontrack" ? "var(--green)" : "var(--text4, #6a6a78)"
                    }}>
                      {project.tech_release ? formatDate(project.tech_release) : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text4, #6a6a78)", borderColor: "var(--border)" }}>
                      {formatRelativeTime(project.updated_at)}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <span
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: completed >= totalSteps
                            ? "var(--green-soft)" : project.status === "active"
                            ? "var(--accent-soft)" : project.status === "archived"
                            ? "var(--red-soft)" : "var(--amber-soft)",
                          color: completed >= totalSteps
                            ? "var(--green)" : project.status === "active"
                            ? "var(--accent)" : project.status === "archived"
                            ? "var(--red)" : "var(--amber)",
                        }}
                      >
                        {completed >= totalSteps ? "Complete" : project.status === "active" ? "Active" : project.status === "archived" ? "Archived" : "Draft"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 h-14 flex items-center gap-3 px-8 z-50 border-t"
          style={{ background: "rgba(23,23,28,0.92)", backdropFilter: "blur(12px)", borderColor: "var(--border)" }}
        >
          <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            {selectedIds.size} selected
          </span>
          <button
            className="rounded-md px-3.5 py-[6px] text-[12px] font-medium border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Export all GDDs
          </button>
          <button
            className="rounded-md px-3.5 py-[6px] text-[12px] font-medium border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Archive all
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto rounded-md px-3.5 py-[6px] text-[12px] border"
            style={{ borderColor: "var(--border)", color: "var(--text3)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
