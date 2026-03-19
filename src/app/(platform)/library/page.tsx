"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type LibraryGame, type PortfolioAnalytics } from "@/lib/api";
import { CsvImport } from "@/components/library/csv-import";
import { TYPE_GRADIENTS, TYPE_LETTER, VOLATILITY_LABELS } from "@/lib/constants";

/* ─── helpers ─────────────────────────────────────────────────────── */

const p = (g: LibraryGame) => g.parameters as Record<string, unknown>;
const pStr = (g: LibraryGame, k: string) => (p(g)[k] as string) ?? "";
const pNum = (g: LibraryGame, k: string) => p(g)[k] as number | undefined;
const pArr = (g: LibraryGame, k: string) => (p(g)[k] as string[]) ?? [];

function fmtMaxWin(v: number | undefined) {
  if (!v) return "—";
  return v >= 1000 ? `${v.toLocaleString()}x` : `${v}x`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  live: { bg: "rgba(61,214,140,0.15)", text: "#3dd68c" },
  development: { bg: "rgba(124,107,245,0.15)", text: "#a78bfa" },
  concept: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
};

const AI_COLOR = (v: number | null | undefined): string => {
  if (v == null) return "#4b5563";
  if (v >= 7) return "#3dd68c";
  if (v >= 4) return "#f0b040";
  return "#ef6060";
};

type SortKey = "name" | "rtp" | "maxWin" | "ai";
type ViewMode = "table" | "cards" | "compact";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name A-Z",
  rtp: "RTP ↓",
  maxWin: "Max Win ↓",
  ai: "AI Score ↓",
};

/* ─── Feature coverage vs market reference data ───────────────────── */
const MARKET_AVG: Record<string, number> = {
  Wild: 90, FS: 85, Multiplier: 72, Cascade: 45, Scatter: 55,
  Respin: 38, "Bonus Buy": 30, Cluster: 20, Megaways: 15,
  "Auto Cashout": 40, "Side Bet": 25, "Lightning Round": 10,
  Accum: 12, Social: 8, "Turbo Mode": 15, "VIP Mode": 10,
};

/* ─── Theme saturation reference data ─────────────────────────────── */
const THEME_SATURATION: Record<string, number> = {
  "Aztec Mythology": 78, "Aztec Gold": 72, Romance: 35, Cyberpunk: 22,
  Space: 45, Chinese: 82, Casino: 65, "Royal Palace": 28, Candy: 55,
  Racing: 30, "Wild West": 62, Gemstone: 48,
};

/* ─── volatility x-position mapping ──────────────────────────────── */
const VOL_X: Record<string, number> = {
  low: 0.1, "med-low": 0.25, med: 0.4, "med-high": 0.6, high: 0.75, ultra: 0.95,
};
const DOT_COLORS: Record<string, string> = { slot: "#7c6bf5", crash: "#f0b040", table: "#06b6d4" };

/* ─── component ──────────────────────────────────────────────────── */

export default function LibraryPage() {
  const router = useRouter();
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [addGameForm, setAddGameForm] = useState({ name: "", game_type: "slot", brand: "", rtp: "", volatility: "", theme: "" });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVol, setFilterVol] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Expand
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Side panel
  const [panelGameId, setPanelGameId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<"overview" | "ai" | "marketing" | "history">("overview");

  const fetchData = useCallback(async () => {
    try {
      const [gamesList, stats] = await Promise.all([api.library.list(), api.library.analytics()]);
      setGames(gamesList);
      setAnalytics(stats);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── computed ──────────────────────────────────────────────────── */

  const uniqueBrands = useMemo(() => [...new Set(games.map((g) => pStr(g, "brand")).filter(Boolean))].sort(), [games]);
  const uniqueTeams = useMemo(() => [...new Set(games.map((g) => pStr(g, "team")).filter(Boolean))].sort(), [games]);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (filterType !== "all" && g.game_type !== filterType) return false;
      if (filterStatus !== "all" && g.status !== filterStatus) return false;
      if (filterBrand !== "all" && pStr(g, "brand") !== filterBrand) return false;
      if (filterVol !== "all" && pStr(g, "volatility") !== filterVol) return false;
      if (filterTeam !== "all" && pStr(g, "team") !== filterTeam) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!g.name.toLowerCase().includes(q) && !pStr(g, "theme").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [games, filterType, filterStatus, filterBrand, filterVol, filterTeam, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortKey) {
      case "name": list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "rtp": list.sort((a, b) => (pNum(b, "rtp") ?? 0) - (pNum(a, "rtp") ?? 0)); break;
      case "maxWin": list.sort((a, b) => (pNum(b, "max_win") ?? 0) - (pNum(a, "max_win") ?? 0)); break;
      case "ai": list.sort((a, b) => (pNum(b, "ai_score") ?? -1) - (pNum(a, "ai_score") ?? -1)); break;
    }
    return list;
  }, [filtered, sortKey]);

  const panelGame = panelGameId ? games.find((g) => g.id === panelGameId) ?? null : null;

  /* ─── Feature adoption computed from data ────────────────────────── */
  const featureAdoption = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of games) {
      for (const f of pArr(g, "features")) counts[f] = (counts[f] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([feature, count]) => ({ feature, count, pct: Math.round((count / games.length) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [games]);

  /* ─── selection handlers ────────────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sorted.map((g) => g.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ─── bulk action handlers ──────────────────────────────────────── */

  const handleBulkExport = useCallback(() => {
    const selected = games.filter((g) => selectedIds.has(g.id));
    const headers = ["Name", "Type", "Brand", "RTP", "Volatility", "Max Win", "Theme", "Status", "Features"];
    const rows = selected.map((g) => [
      g.name, g.game_type, pStr(g, "brand"), String(pNum(g, "rtp") ?? ""),
      pStr(g, "volatility"), String(pNum(g, "max_win") ?? ""), pStr(g, "theme"),
      g.status, pArr(g, "features").join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `library-export-${selected.length}-games.csv`;
    a.click(); URL.revokeObjectURL(url);
    clearSelection();
  }, [games, selectedIds, clearSelection]);

  const handleBulkArchive = useCallback(async () => {
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.library.update(id, { status: "archived" }))
      );
      clearSelection();
      fetchData();
    } catch { /* ignore */ }
    setBulkLoading(false);
  }, [selectedIds, clearSelection, fetchData]);

  const handleAddGame = useCallback(async () => {
    if (!addGameForm.name.trim()) return;
    // Get display name and team from settings
    let createdBy = "Unknown";
    let teamName = "";
    try {
      const raw = localStorage.getItem("slotcraft_settings");
      if (raw) { const s = JSON.parse(raw); createdBy = s.displayName || "Unknown"; teamName = s.teamName || ""; }
    } catch { /* ignore */ }
    try {
      await api.library.create({
        name: addGameForm.name.trim(),
        game_type: addGameForm.game_type,
        parameters: {
          brand: addGameForm.brand || undefined, rtp: addGameForm.rtp ? Number(addGameForm.rtp) : undefined,
          volatility: addGameForm.volatility || undefined, theme: addGameForm.theme || undefined,
          created_by: createdBy, team: teamName || undefined,
        },
        status: "concept",
      });
      setShowAddGame(false);
      setAddGameForm({ name: "", game_type: "slot", brand: "", rtp: "", volatility: "", theme: "" });
      fetchData();
    } catch { /* ignore */ }
  }, [addGameForm, fetchData]);

  /* ─── render ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-[1440px] px-6 py-6">
        {/* ─── 1. Header ───────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Game Library</h1>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--text3)" }}>
              Portfolio catalog — {games.length} game{games.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors"
              style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddGame(true)}
              className="rounded-md px-3.5 py-2 text-[13px] font-medium text-white transition-colors"
              style={{ background: "var(--accent)" }}
            >
              + Add game
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg p-4 text-sm" style={{ background: "rgba(239,96,96,0.1)", color: "#ef6060", border: "1px solid rgba(239,96,96,0.2)" }}>
            <p>{error}</p>
            <button onClick={() => { setError(null); fetchData(); }} className="mt-1 text-xs font-medium underline">Retry</button>
          </div>
        )}

        {/* Analytics cards removed per user request */}

        {/* ─── 3. Filters row ──────────────────────────────────── */}
        {games.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search name or theme..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[180px] rounded-md px-3 py-1.5 text-[12px]"
              style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
            <FilterSelect value={filterType} onChange={setFilterType} label="All Types"
              options={[...new Set(games.map((g) => g.game_type))].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
            <FilterSelect value={filterBrand} onChange={setFilterBrand} label="All Brands"
              options={uniqueBrands.map((b) => ({ value: b, label: b }))} />
            <FilterSelect value={filterStatus} onChange={setFilterStatus} label="All Status"
              options={[{ value: "live", label: "Live" }, { value: "development", label: "Development" }, { value: "concept", label: "Concept" }]} />
            <FilterSelect value={filterVol} onChange={setFilterVol} label="All Volatility"
              options={Object.entries(VOLATILITY_LABELS).filter(([k]) => !k.includes("_")).map(([v, l]) => ({ value: v, label: l }))} />
            <FilterSelect value={filterTeam} onChange={setFilterTeam} label="All Teams"
              options={uniqueTeams.map((t) => ({ value: t, label: t }))} />
            <div className="w-px h-6 mx-1" style={{ background: "var(--border)" }} />
            <FilterSelect value={sortKey} onChange={(v) => setSortKey(v as SortKey)} label=""
              options={Object.entries(SORT_LABELS).map(([v, l]) => ({ value: v, label: l }))} noAll />
            <div className="w-px h-6 mx-1" style={{ background: "var(--border)" }} />
            <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {(["table", "cards", "compact"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className="px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                  style={{
                    background: viewMode === m ? "var(--accent)" : "var(--surface)",
                    color: viewMode === m ? "#fff" : "var(--text3)",
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── 4. Data table ───────────────────────────────────── */}
        {sorted.length > 0 && viewMode === "table" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: "var(--surface)" }}>
                    <th className="w-10 px-3 py-2.5">
                      <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 rounded accent-purple-500" />
                    </th>
                    <th className="w-8 px-1 py-2.5" />
                    {["Game", "Brand", "Type", "RTP", "Vol", "Max Win", "Features", "AI Score", "Status", "Created by", "Team", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text4)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((game, idx) => {
                    const aiScore = pNum(game, "ai_score") ?? null;
                    const features = pArr(game, "features");
                    const isExpanded = expandedIds.has(game.id);
                    const isSelected = selectedIds.has(game.id);

                    return (
                      <GameRow
                        key={game.id}
                        game={game}
                        idx={idx}
                        aiScore={aiScore}
                        features={features}
                        isExpanded={isExpanded}
                        isSelected={isSelected}
                        onToggleSelect={() => toggleSelect(game.id)}
                        onToggleExpand={() => toggleExpand(game.id)}
                        onOpenPanel={() => { setPanelGameId(game.id); setPanelTab("overview"); }}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Cards view ──────────────────────────────────────── */}
        {sorted.length > 0 && viewMode === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((game) => {
              const aiScore = pNum(game, "ai_score") ?? null;
              const features = pArr(game, "features");
              return (
                <div
                  key={game.id}
                  className="rounded-xl p-4 cursor-pointer transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  onClick={() => { setPanelGameId(game.id); setPanelTab("overview"); }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TypeIcon type={game.game_type} size={32} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{game.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text4)" }}>{pStr(game, "brand")} · {game.game_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] mb-2" style={{ color: "var(--text3)" }}>
                    <span><b style={{ color: "var(--text)" }}>{(pNum(game, "rtp") ?? 0).toFixed(1)}%</b> RTP</span>
                    <span>{VOLATILITY_LABELS[pStr(game, "volatility")] ?? "—"}</span>
                    <span>{fmtMaxWin(pNum(game, "max_win"))}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {features.slice(0, 3).map((f) => (
                      <span key={f} className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>{f}</span>
                    ))}
                    {features.length > 3 && <span className="text-[9px] px-1 py-0.5" style={{ color: "var(--text4)" }}>+{features.length - 3}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={game.status} />
                    <AiScoreBadge score={aiScore} size={24} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Compact view ────────────────────────────────────── */}
        {sorted.length > 0 && viewMode === "compact" && (
          <div className="space-y-1">
            {sorted.map((game) => (
              <div
                key={game.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                style={{ background: "var(--surface)", border: "1px solid transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                onClick={() => { setPanelGameId(game.id); setPanelTab("overview"); }}
              >
                <TypeIcon type={game.game_type} size={24} />
                <span className="text-[12px] font-medium min-w-[200px]" style={{ color: "var(--text)" }}>{game.name}</span>
                <span className="text-[11px] w-14" style={{ color: "var(--text3)" }}>{(pNum(game, "rtp") ?? 0).toFixed(1)}%</span>
                <span className="text-[11px] w-16" style={{ color: "var(--text4)" }}>{VOLATILITY_LABELS[pStr(game, "volatility")] ?? "—"}</span>
                <span className="text-[11px] w-16" style={{ color: "var(--text4)" }}>{fmtMaxWin(pNum(game, "max_win"))}</span>
                <div className="flex-1" />
                <StatusBadge status={game.status} />
              </div>
            ))}
          </div>
        )}

        {games.length > 0 && sorted.length === 0 && (
          <p className="py-8 text-center text-[13px]" style={{ color: "var(--text4)" }}>No games match your filters.</p>
        )}

        {games.length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: "var(--surface)", border: "2px dashed var(--border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No games in library</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text3)" }}>Import your existing game portfolio via CSV to get started.</p>
            <button onClick={() => setShowImport(true)} className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: "var(--accent)" }}>
              Import CSV
            </button>
          </div>
        )}
      </div>

      {/* ─── 5. Side panel ──────────────────────────────────────── */}
      {panelGame && (
        <SidePanel game={panelGame} tab={panelTab} onTabChange={setPanelTab} onClose={() => setPanelGameId(null)} onOpenWizard={(pid) => { if (pid) router.push(`/games/${pid}`); }} />
      )}

      {/* ─── 6. Bulk actions bar ────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl px-5 py-3 shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{selectedIds.size} selected</span>
          <button onClick={handleBulkExport} className="rounded-md px-3 py-1.5 text-[12px] font-medium" style={{ background: "var(--accent)", color: "#fff" }}>Export CSV</button>
          <button onClick={handleBulkArchive} disabled={bulkLoading} className="rounded-md px-3 py-1.5 text-[12px] font-medium disabled:opacity-50" style={{ background: "rgba(239,96,96,0.12)", color: "#ef6060" }}>{bulkLoading ? "Archiving..." : "Archive"}</button>
          <button onClick={clearSelection} className="rounded-md px-3 py-1.5 text-[12px] font-medium" style={{ color: "var(--text3)" }}>Cancel</button>
        </div>
      )}

      {/* Add Game Modal */}
      {showAddGame && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowAddGame(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[420px] rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: "var(--text)" }}>Add New Game</h3>
            <div className="space-y-3">
              <input value={addGameForm.name} onChange={(e) => setAddGameForm((f) => ({ ...f, name: e.target.value }))} placeholder="Game name" className="w-full rounded-md px-3 py-2 text-[12px]" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <select value={addGameForm.game_type} onChange={(e) => setAddGameForm((f) => ({ ...f, game_type: e.target.value }))} className="rounded-md px-3 py-2 text-[12px]" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <option value="slot">Slot</option><option value="crash">Crash</option><option value="table">Table</option>
                </select>
                <input value={addGameForm.brand} onChange={(e) => setAddGameForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Brand" className="rounded-md px-3 py-2 text-[12px]" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={addGameForm.rtp} onChange={(e) => setAddGameForm((f) => ({ ...f, rtp: e.target.value }))} placeholder="RTP (e.g. 96.0)" type="number" step="0.1" className="rounded-md px-3 py-2 text-[12px]" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
                <select value={addGameForm.volatility} onChange={(e) => setAddGameForm((f) => ({ ...f, volatility: e.target.value }))} className="rounded-md px-3 py-2 text-[12px]" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <option value="">Volatility</option><option value="low">Low</option><option value="med">Med</option><option value="med-high">Med-High</option><option value="high">High</option><option value="ultra">Ultra</option>
                </select>
              </div>
              <input value={addGameForm.theme} onChange={(e) => setAddGameForm((f) => ({ ...f, theme: e.target.value }))} placeholder="Theme (e.g. Aztec Mythology)" className="w-full rounded-md px-3 py-2 text-[12px]" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowAddGame(false)} className="rounded-md px-3 py-1.5 text-[12px]" style={{ color: "var(--text3)" }}>Cancel</button>
              <button onClick={handleAddGame} disabled={!addGameForm.name.trim()} className="rounded-md px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-40" style={{ background: "var(--accent)" }}>Add Game</button>
            </div>
          </div>
        </>
      )}

      {/* CSV Import Modal */}
      {showImport && <CsvImport onClose={() => setShowImport(false)} onImported={fetchData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════ */

function TypeIcon({ type, size = 28 }: { type: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md font-bold text-white"
      style={{ width: size, height: size, background: TYPE_GRADIENTS[type] ?? "#6b7280", fontSize: size * 0.45 }}
    >
      {TYPE_LETTER[type] ?? "?"}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.concept;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: s.bg, color: s.text }}>
      {status === "development" ? "Dev" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AiScoreBadge({ score, size = 28 }: { score: number | null; size?: number }) {
  const color = AI_COLOR(score);
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, border: `2px solid ${color}`, color, fontSize: size * 0.38 }}
    >
      {score != null ? score.toFixed(1) : "—"}
    </div>
  );
}

function FilterSelect({ value, onChange, label, options, noAll }: {
  value: string; onChange: (v: string) => void; label: string;
  options: { value: string; label: string }[];
  noAll?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md px-2.5 py-1.5 text-[12px] font-medium"
      style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
    >
      {!noAll && <option value="all">{label}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ─── Scatter chart ─────────────────────────────────────────────── */

function ScatterChart({ games }: { games: LibraryGame[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rtps = games.map((g) => pNum(g, "rtp") ?? 96).filter(Boolean);
  const minRtp = Math.floor(Math.min(...rtps)) - 0.5;
  const maxRtp = Math.ceil(Math.max(...rtps)) + 0.5;
  const W = 220, H = 140, PAD = 24;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" style={{ maxHeight: 160 }}>
      {/* Y axis labels */}
      {[minRtp, (minRtp + maxRtp) / 2, maxRtp].map((v) => {
        const y = PAD + (1 - (v - minRtp) / (maxRtp - minRtp)) * (H - 2 * PAD);
        return (
          <g key={v}>
            <line x1={PAD} x2={W - 4} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={PAD - 4} y={y + 3} textAnchor="end" fontSize={8} fill="var(--text4)">{v.toFixed(0)}%</text>
          </g>
        );
      })}
      {/* X axis labels */}
      {(["Low", "Med", "High", "Ultra"] as const).map((label, i) => {
        const x = PAD + (i / 3) * (W - 2 * PAD);
        return <text key={label} x={x} y={H - 4} textAnchor="middle" fontSize={8} fill="var(--text4)">{label}</text>;
      })}
      {/* Dots */}
      {games.map((game) => {
        const rtp = pNum(game, "rtp") ?? 96;
        const vol = pStr(game, "volatility");
        const vx = VOL_X[vol] ?? 0.5;
        const x = PAD + vx * (W - 2 * PAD);
        const y = PAD + (1 - (rtp - minRtp) / (maxRtp - minRtp)) * (H - 2 * PAD);
        const color = DOT_COLORS[game.game_type] ?? "#9ca3af";
        const isHov = hovered === game.id;
        return (
          <g key={game.id} onMouseEnter={() => setHovered(game.id)} onMouseLeave={() => setHovered(null)}>
            <circle cx={x} cy={y} r={isHov ? 5 : 3.5} fill={color} opacity={isHov ? 1 : 0.7} style={{ transition: "r 0.15s" }} />
            {isHov && (
              <g>
                <rect x={x - 50} y={y - 22} width={100} height={16} rx={3} fill="var(--surface)" stroke="var(--border)" strokeWidth={0.5} />
                <text x={x} y={y - 11} textAnchor="middle" fontSize={7} fill="var(--text)">{game.name} ({rtp}%, {VOLATILITY_LABELS[vol] ?? vol})</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Game table row ─────────────────────────────────────────────── */

function GameRow({ game, idx, aiScore, features, isExpanded, isSelected, onToggleSelect, onToggleExpand, onOpenPanel }: {
  game: LibraryGame; idx: number; aiScore: number | null; features: string[];
  isExpanded: boolean; isSelected: boolean;
  onToggleSelect: () => void; onToggleExpand: () => void; onOpenPanel: () => void;
}) {
  const rowBg = idx % 2 === 0 ? "var(--surface)" : "var(--bg2, var(--surface))";

  return (
    <>
      <tr
        className="group transition-colors"
        style={{ background: isSelected ? "rgba(124,107,245,0.08)" : rowBg }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg3, rgba(255,255,255,0.03))"; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = rowBg; }}
      >
        <td className="px-3 py-2">
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-3.5 w-3.5 rounded accent-purple-500" />
        </td>
        <td className="px-1 py-2">
          <button onClick={onToggleExpand} className="text-[11px] w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text4)" }}>
            {isExpanded ? "▼" : "►"}
          </button>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <TypeIcon type={game.game_type} />
            <button onClick={onOpenPanel} className="text-[12px] font-medium hover:underline text-left" style={{ color: "var(--accent)" }}>{game.name}</button>
          </div>
        </td>
        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text4)" }}>{pStr(game, "brand")}</td>
        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text4)" }}>{game.game_type}</td>
        <td className="px-3 py-2 text-[12px] font-semibold" style={{ color: "var(--text)" }}>
          {(pNum(game, "rtp") ?? 0).toFixed(1)}%
        </td>
        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text4)" }}>
          {VOLATILITY_LABELS[pStr(game, "volatility")] ?? "—"}
        </td>
        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text3)" }}>
          {fmtMaxWin(pNum(game, "max_win"))}
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {features.slice(0, 3).map((f) => (
              <span key={f} className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>{f}</span>
            ))}
            {features.length > 3 && <span className="text-[9px] px-1 py-0.5" style={{ color: "var(--text4)" }}>+{features.length - 3}</span>}
          </div>
        </td>
        <td className="px-3 py-2">
          <AiScoreBadge score={aiScore} />
        </td>
        <td className="px-3 py-2">
          <StatusBadge status={game.status} />
        </td>
        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text4)" }}>{pStr(game, "created_by")}</td>
        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text4)" }}>{pStr(game, "team")}</td>
        <td className="px-3 py-2">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onOpenPanel} className="rounded px-2 py-1 text-[10px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>View</button>
            <button className="rounded px-2 py-1 text-[10px] font-medium" style={{ color: "var(--text3)" }}>Improve</button>
            <button className="rounded px-1.5 py-1 text-[10px]" style={{ color: "var(--text4)" }}>···</button>
          </div>
        </td>
      </tr>
      {/* Expanded detail row */}
      {isExpanded && (
        <tr style={{ background: "var(--bg)" }}>
          <td colSpan={15} className="px-12 py-3">
            <div className="space-y-1 text-[11px]" style={{ color: "var(--text3)" }}>
              <p>
                <span style={{ color: "var(--text4)" }}>Grid:</span> {pNum(game, "reels") ?? "—"}×{pNum(game, "rows") ?? "—"} · {pNum(game, "paylines") != null ? `${(pNum(game, "paylines") ?? 0).toLocaleString()} paylines` : "—"} · Bet: €{pNum(game, "min_bet") ?? "—"}–€{pNum(game, "max_bet") ?? "—"}
              </p>
              <p>
                <span style={{ color: "var(--text4)" }}>Features:</span> {features.length > 0 ? features.join(", ") : "—"}
              </p>
              <p>
                <span style={{ color: "var(--text4)" }}>Theme:</span> {pStr(game, "theme") || "—"} · <span style={{ color: "var(--text4)" }}>Hit freq:</span> {pNum(game, "hit_frequency") ? `${pNum(game, "hit_frequency")}%` : "—"}
              </p>
              <p>
                <span style={{ color: "var(--text4)" }}>AI Analysis:</span>{" "}
                {aiScore != null ? (
                  <span style={{ color: AI_COLOR(aiScore) }}>Overall {aiScore}/10</span>
                ) : (
                  <span style={{ color: "var(--text4)" }}>not run yet</span>
                )}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={onOpenPanel} className="rounded px-2.5 py-1 text-[10px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>Full dashboard</button>
                <button className="rounded px-2.5 py-1 text-[10px] font-medium" style={{ background: "var(--surface)", color: "var(--text3)", border: "1px solid var(--border)" }}>Run AI analysis</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Side panel ─────────────────────────────────────────────────── */

function SidePanel({ game, tab, onTabChange, onClose, onOpenWizard }: {
  game: LibraryGame;
  tab: "overview" | "ai" | "marketing" | "history";
  onTabChange: (t: "overview" | "ai" | "marketing" | "history") => void;
  onClose: () => void;
  onOpenWizard: (projectId: string | null) => void;
}) {
  const aiScore = pNum(game, "ai_score") ?? null;
  const features = pArr(game, "features");

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-[420px] overflow-y-auto"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 text-xl" style={{ color: "var(--text4)" }}>×</button>

        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <TypeIcon type={game.game_type} size={40} />
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold truncate" style={{ color: "var(--text)" }}>{game.name}</h2>
              <p className="text-[11px] flex flex-wrap items-center gap-1" style={{ color: "var(--text3)" }}>
                {pStr(game, "brand")} · {game.game_type} · {VOLATILITY_LABELS[pStr(game, "volatility")] ?? "—"} · {(pNum(game, "rtp") ?? 0).toFixed(1)}% RTP · <StatusBadge status={game.status} />
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["overview", "ai", "marketing", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className="px-3 py-2 text-[12px] font-medium transition-colors"
              style={{
                color: tab === t ? "var(--accent)" : "var(--text4)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t === "ai" ? "AI Analysis" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {tab === "overview" && (
            <div className="space-y-4">
              {/* Key metrics */}
              <div className="space-y-2">
                {([
                  ["Brand", pStr(game, "brand")],
                  ["RTP", `${(pNum(game, "rtp") ?? 0).toFixed(1)}%`],
                  ["Max win", fmtMaxWin(pNum(game, "max_win"))],
                  ["Hit frequency", pNum(game, "hit_frequency") ? `${pNum(game, "hit_frequency")}%` : "—"],
                  ["Volatility", VOLATILITY_LABELS[pStr(game, "volatility")] ?? "—"],
                  ["Theme", pStr(game, "theme") || "—"],
                  ["Created by", pStr(game, "created_by") || "—"],
                  ["Team", pStr(game, "team") || "—"],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-[11px]" style={{ color: "var(--text4)" }}>{label}</span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text4)" }}>Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {features.length > 0 ? features.map((f) => (
                    <span key={f} className="rounded px-2 py-1 text-[11px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>{f}</span>
                  )) : (
                    <span className="text-[11px]" style={{ color: "var(--text4)" }}>None</span>
                  )}
                </div>
              </div>

              {/* AI Score */}
              <div className="flex items-center gap-3 mt-2">
                <AiScoreBadge score={aiScore} size={40} />
                <div>
                  {aiScore != null ? (
                    <p className="text-[12px] font-medium" style={{ color: AI_COLOR(aiScore) }}>{aiScore}/10 overall</p>
                  ) : (
                    <>
                      <p className="text-[12px]" style={{ color: "var(--text4)" }}>Not analyzed yet</p>
                      <button className="mt-1 text-[11px] font-medium" style={{ color: "var(--accent)" }}>Run AI analysis</button>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button onClick={() => onOpenWizard(game.project_id)} className="flex-1 rounded-md py-2 text-[12px] font-medium text-white" style={{ background: "var(--accent)" }}>Open in wizard</button>
                <button onClick={() => onTabChange("marketing")} className="flex-1 rounded-md py-2 text-[12px] font-medium" style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}>Marketing</button>
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-3">
              {aiScore != null ? (
                <>
                  <div className="flex items-center gap-3">
                    <AiScoreBadge score={aiScore} size={48} />
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: AI_COLOR(aiScore) }}>{aiScore}/10</p>
                      <p className="text-[11px]" style={{ color: "var(--text4)" }}>Overall AI Score</p>
                    </div>
                  </div>
                  <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <p className="text-[11px] font-semibold" style={{ color: "var(--text3)" }}>Assessment</p>
                    <p className="text-[11px]" style={{ color: "var(--text2)" }}>
                      {aiScore >= 7 ? "Strong game design with solid mechanics and market appeal." : aiScore >= 5 ? "Decent foundation but could benefit from refinement in key areas." : "Needs significant improvements to compete in current market."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <AiScoreBadge score={null} size={48} />
                  <p className="mt-3 text-[12px]" style={{ color: "var(--text4)" }}>AI analysis has not been run yet</p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text4)" }}>Open the game in the wizard to run a full analysis</p>
                </div>
              )}
            </div>
          )}
          {tab === "marketing" && (
            <div className="space-y-3">
              <p className="text-[11px]" style={{ color: "var(--text4)" }}>Generate marketing materials for this game from the Marketing page.</p>
              <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>Game: {game.name}</p>
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>Theme: {pStr(game, "theme") || "—"}</p>
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>Type: {game.game_type}</p>
              </div>
              <button onClick={() => { onClose(); window.location.href = "/marketing"; }} className="w-full rounded-md py-2 text-[12px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>Go to Marketing</button>
            </div>
          )}
          {tab === "history" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
                <span className="text-[11px]" style={{ color: "var(--text3)" }}>Created</span>
                <span className="ml-auto text-[10px]" style={{ color: "var(--text4)" }}>{new Date(game.created_at).toLocaleDateString()}</span>
              </div>
              {game.updated_at !== game.created_at && (
                <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>Last updated</span>
                  <span className="ml-auto text-[10px]" style={{ color: "var(--text4)" }}>{new Date(game.updated_at).toLocaleDateString()}</span>
                </div>
              )}
              {game.ai_analyzed_at && (
                <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f0b040" }} />
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>AI analyzed</span>
                  <span className="ml-auto text-[10px]" style={{ color: "var(--text4)" }}>{new Date(game.ai_analyzed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
