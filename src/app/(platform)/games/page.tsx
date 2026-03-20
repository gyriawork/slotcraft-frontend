"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Project } from "@/lib/api";
import type { Step2Data, Step6Data } from "@/lib/wizard-types";
import {
  TOTAL_WIZARD_STEPS,
  STEP_NAMES,
  VOLATILITY_LABELS,
  DATE_LABELS,
} from "@/lib/constants";

type SortMode = "updated" | "progress" | "release" | "name" | "rtp";

/* ── helpers ── */

function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yy} ${hh}:${min}`;
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

function getSettingsField(field: "displayName" | "teamName" | "studioName", fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem("reelspec_settings");
    if (raw) { const s = JSON.parse(raw); return s[field] || fallback; }
  } catch { /* ignore */ }
  return fallback;
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
  const [newBrand, setNewBrand] = useState("");
  const [creating, setCreating] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [newDates, setNewDates] = useState<{ development_start: string; development_end: string; tech_release: string; pre_release: string; marketing_release: string }>({ development_start: "", development_end: "", tech_release: "", pre_release: "", marketing_release: "" });
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "slot" | "crash" | "table">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<SortMode>("updated");

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
    try {
      const raw = localStorage.getItem("reelspec_brands");
      if (raw) setBrands(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [fetchProjects]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const created = await api.projects.create({
        name: newName.trim(),
        game_type: "slot" as const,
        development_start: newDates.development_start || null,
        development_end: newDates.development_end || null,
        tech_release: newDates.tech_release || null,
        pre_release: newDates.pre_release || null,
        marketing_release: newDates.marketing_release || null,
      });
      // Store brand in step_data if selected
      if (newBrand) {
        try { await api.projects.update(created.id, { step_data: { ...created.step_data, brand: newBrand } }); } catch { /* ignore */ }
      }
      setNewName("");
      setNewBrand("");
      setNewDates({ development_start: "", development_end: "", tech_release: "", pre_release: "", marketing_release: "" });
      setShowDates(false);
      setShowCreate(false);
      router.push(`/games/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }, [newName, newBrand, newDates, creating, router]);

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

      {/* Search + Filters + Sort */}
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
            {brands.length > 0 && (
              <select
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                className="rounded-md border px-3 py-2 text-[12px]"
                style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                <option value="">Brand</option>
                {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            )}
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

      {/* ── TABLE VIEW (only view) ── */}
      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {["Name", "Brand", "Type", "RTP", "Vol", "Release", "Updated", "Created by", "Team", "Status"].map((col) => (
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
                      {(project.step_data as Record<string, unknown>)?.brand as string ?? getSettingsField("studioName", "\u2014")}
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
                    <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{
                      borderColor: "var(--border)",
                      color: releaseDateClass(project.tech_release) === "overdue" ? "var(--red)" :
                             releaseDateClass(project.tech_release) === "ontrack" ? "var(--green)" : "var(--text4, #6a6a78)"
                    }}>
                      {project.tech_release ? formatDate(project.tech_release) : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {formatDateTime(project.updated_at)}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {getSettingsField("displayName", "Game Designer")}
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                      {getSettingsField("teamName", "—")}
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
    </div>
  );
}
