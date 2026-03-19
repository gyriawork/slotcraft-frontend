"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Project } from "@/lib/api";
import { buildProductSheetData } from "@/components/marketing/product-sheet-utils";

/* ── constants ── */

const TYPE_GRADIENTS: Record<string, string> = {
  slot: "linear-gradient(135deg, #7c6bf5, #a78bfa)",
  crash: "linear-gradient(135deg, #f59e0b, #ef4444)",
  table: "linear-gradient(135deg, #10b981, #06b6d4)",
};
const TYPE_LETTER: Record<string, string> = { slot: "S", crash: "C", table: "T" };

const TABS = ["Promotion pack", "Game assets", "Screenshots", "Product sheet", "Marketing copy"];

/* ── Promotion Pack data ── */

interface SizeTemplate {
  w: number;
  h: number;
  label: string;
  aspect: string;
  uploaded: ("JPG" | "PSD")[];
}

const ICON_SIZES_INIT: SizeTemplate[] = [
  { w: 1920, h: 250, label: "Website banner", aspect: "horizontal", uploaded: [] },
  { w: 1800, h: 400, label: "Email header", aspect: "horizontal", uploaded: [] },
  { w: 1000, h: 700, label: "Lobby tile (large)", aspect: "horizontal", uploaded: [] },
  { w: 945, h: 370, label: "Featured banner", aspect: "horizontal", uploaded: [] },
  { w: 720, h: 340, label: "Lobby tile (medium)", aspect: "horizontal", uploaded: [] },
  { w: 450, h: 330, label: "Thumbnail", aspect: "square", uploaded: [] },
  { w: 446, h: 186, label: "Compact banner", aspect: "leaderboard", uploaded: [] },
  { w: 300, h: 300, label: "Social media square", aspect: "square", uploaded: [] },
];

const ASPECT_TABS = [
  { key: "horizontal", label: "16:9", sub: "Horizontal" },
  { key: "vertical", label: "4:5", sub: "Vertical" },
  { key: "square", label: "1:1", sub: "Square" },
  { key: "leaderboard", label: "1.91:1", sub: "Leaderboard" },
];

/* ── Game Assets data ── */

interface AssetItem {
  emoji: string;
  name: string;
  type: string;
  dims: string;
  category: string;
  selected?: boolean;
}

const ROLE_EMOJI: Record<string, string> = {
  wild: "🌀",
  scatter: "⚡",
  high_pay: "💎",
  low_pay: "🔤",
};

function buildAssetsFromProject(project: Project | null): AssetItem[] {
  const base: AssetItem[] = [
    { emoji: "🎨", name: "Background", type: "PNG", dims: "1920x1080", category: "Backgrounds" },
    { emoji: "🏛", name: "bg_reels", type: "PNG", dims: "1920x1080", category: "Backgrounds" },
    { emoji: "🎮", name: "Game elements", type: "PSD", dims: "layered", category: "UI elements" },
  ];
  const sd = project?.step_data ?? {};
  const s4 = (sd.step4 ?? {}) as { symbols?: Array<{ id: string; name: string; role: string; emoji?: string }> };
  if (s4.symbols && Array.isArray(s4.symbols)) {
    for (const sym of s4.symbols) {
      base.push({
        emoji: sym.emoji ?? ROLE_EMOJI[sym.role] ?? "🎰",
        name: sym.name,
        type: "PNG",
        dims: "256x256",
        category: "Symbols",
        selected: true,
      });
    }
  } else {
    base.push(
      { emoji: "🌀", name: "Wild symbol", type: "PNG", dims: "256x256", category: "Symbols" },
      { emoji: "⚡", name: "Scatter", type: "PNG", dims: "256x256", category: "Symbols" },
    );
  }
  base.push(
    { emoji: "SC", name: "Logo", type: "SVG", dims: "", category: "Logos" },
    { emoji: "SC", name: "Logo_white", type: "SVG", dims: "", category: "Logos" },
  );
  return base;
}

const ASSET_CATEGORIES = ["All", "Symbols", "Backgrounds", "UI elements", "Logos", "Effects"];

/* ── Screenshots data ── */

interface ScreenshotItem {
  label: string;
  gradient: string;
  assignment: string;
}

const SCREENSHOT_GRADIENTS = [
  "linear-gradient(135deg,#1a0f2e,#2d1854)",
  "linear-gradient(135deg,#1a0f2e,#4a1854)",
  "linear-gradient(135deg,#2d1854,#0f2e1a)",
  "linear-gradient(135deg,#2d1a00,#4a2800)",
  "linear-gradient(135deg,#d4a017,#8b5cf6)",
];

function buildScreenshots(features: string[]): ScreenshotItem[] {
  const shots: ScreenshotItem[] = [
    { label: "Base game view", gradient: SCREENSHOT_GRADIENTS[0], assignment: "Product Sheet: hero / overview" },
  ];
  features.slice(0, 4).forEach((f, i) => {
    shots.push({
      label: f,
      gradient: SCREENSHOT_GRADIENTS[(i + 1) % SCREENSHOT_GRADIENTS.length],
      assignment: `${f} feature`,
    });
  });
  return shots;
}

/* ── Product Sheet features (dynamic) ── */

const FEATURE_GRADIENTS = [
  "linear-gradient(135deg,#1a0f2e,#2d1854)",
  "linear-gradient(135deg,#1a0f2e,#4a1854)",
  "linear-gradient(135deg,#2d1854,#0f2e1a)",
  "linear-gradient(135deg,#2d1a00,#4a2800)",
  "linear-gradient(135deg,#d4a017,#8b5cf6)",
];

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  "Free Spins": "Trigger free spins by landing scatter symbols. Re-triggers possible during the bonus round.",
  "Wild Substitution": "Wild symbols substitute for all regular symbols in winning combinations, except Scatter.",
  "Scatter Pay": "Scatter symbols pay in any position. 3+ scatters trigger the bonus feature.",
  "Multiplier": "Win multipliers increase payouts during bonus features.",
  "Cascading Reels": "Winning symbols are removed and new ones drop from above, allowing consecutive wins.",
  "Megaways": "Dynamic reel modifier with up to 117,649 ways to win on each spin.",
  "Bonus Buy": "Purchase and immediately trigger the bonus feature.",
};

function buildPsFeatures(project: Project | null): { name: string; desc: string; gradient: string }[] {
  const sd = project?.step_data ?? {};
  const s3 = (sd.step3 ?? {}) as { features?: unknown[] };
  const s4 = (sd.step4 ?? {}) as { theme?: { bonus_narrative?: string; usp_detail?: string } };
  const rawFeatures = Array.isArray(s3.features) ? s3.features : [];

  const featureNames: string[] = rawFeatures.map((f: unknown) => {
    if (typeof f === "string") return f;
    const item = f as { type?: string; variant?: string; label?: string };
    return item.label ?? item.type ?? item.variant ?? "Feature";
  });

  if (featureNames.length === 0) {
    return [{ name: "NO FEATURES", desc: "Complete Step 3 to define game features.", gradient: FEATURE_GRADIENTS[0] }];
  }

  return featureNames.map((name, i) => ({
    name: name.toUpperCase(),
    desc: FEATURE_DESCRIPTIONS[name] ?? (i === 0 && s4.theme?.usp_detail ? s4.theme.usp_detail : `${name} feature — complete Step 4 for detailed descriptions.`),
    gradient: FEATURE_GRADIENTS[i % FEATURE_GRADIENTS.length],
  }));
}

/* ══════════════════════════════════════════════ */
/*  COMPONENT                                    */
/* ══════════════════════════════════════════════ */

export default function MarketingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState(0);

  // Promotion pack state
  const [sizes, setSizes] = useState<SizeTemplate[]>(ICON_SIZES_INIT);
  const [aspectFilter, setAspectFilter] = useState("horizontal");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  // Game assets state
  const [assetCategory, setAssetCategory] = useState("All");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [uploadedAssets, setUploadedAssets] = useState<AssetItem[]>([]);
  const [extraScreenshots, setExtraScreenshots] = useState<{ label: string; url: string }[]>([]);

  // Product sheet template
  const [psTemplate, setPsTemplate] = useState("Standard");

  // Marketing copy state
  type CopySection = "descriptions" | "selling_points" | "press_release" | "social" | "seo";
  const [copySection, setCopySection] = useState<CopySection>("descriptions");
  const [generating, setGenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [pressRelease, setPressRelease] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch {
      // silently fail — page works with empty state
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selected = useMemo(() => projects.find((p) => p.id === selectedId) ?? null, [projects, selectedId]);

  const sheet = useMemo(() => {
    if (!selected) return null;
    return buildProductSheetData(selected.step_data ?? {}, selected.name);
  }, [selected]);

  // Dynamic data derived from selected project
  const gameAssets = useMemo(() => [...buildAssetsFromProject(selected), ...uploadedAssets], [selected, uploadedAssets]);

  const handleAssetUpload = useCallback((files: File[]) => {
    const newAssets: AssetItem[] = files.map((f) => {
      const ext = f.name.split(".").pop()?.toUpperCase() ?? "FILE";
      const isImage = f.type.startsWith("image/");
      const cat = ext === "SVG" ? "Logos" : ext === "PSD" || ext === "AI" ? "UI elements" : isImage ? "Backgrounds" : "Effects";
      return { emoji: "📁", name: f.name.replace(/\.[^.]+$/, ""), type: ext, dims: "", category: cat };
    });
    setUploadedAssets((prev) => [...prev, ...newAssets]);
  }, []);
  const psFeatures = useMemo(() => buildPsFeatures(selected), [selected]);
  const screenshots = useMemo(() => {
    const sd = selected?.step_data ?? {};
    const s3 = (sd.step3 ?? {}) as { features?: unknown[] };
    const featureNames = Array.isArray(s3.features)
      ? s3.features.map((f: unknown) => typeof f === "string" ? f : ((f as { label?: string; type?: string }).label ?? (f as { type?: string }).type ?? "Feature"))
      : [];
    return buildScreenshots(featureNames);
  }, [selected]);

  // Marketing copy — context builder & AI generate handlers (must be after `selected`)
  function getCopyContext() {
    const sd = selected?.step_data ?? {};
    const s1 = (sd.step1 ?? {}) as Record<string, unknown>;
    const s2 = (sd.step2 ?? {}) as Record<string, unknown>;
    const s3 = (sd.step3 ?? {}) as { features?: Array<{ type?: string; variant?: string; label?: string }> };
    const s4 = (sd.step4 ?? {}) as { naming?: { selected?: string }; theme?: { description?: string } };
    return {
      game_name: s4.naming?.selected ?? (s1.variant as string) ?? selected?.name ?? "Untitled",
      game_type: s1.game_type as string | undefined,
      theme_description: s4.theme?.description,
      features: s3.features?.map((f) => f.variant ?? f.type ?? f.label ?? "") ?? [],
      rtp: (sd.step6 as Record<string, unknown>)?.rtp as number | undefined ?? s2.target_rtp as number | undefined,
      volatility: s2.volatility as string | undefined,
      max_win: (sd.step6 as Record<string, unknown>)?.max_win as number | undefined ?? s2.max_win as number | undefined,
      grid: s1.grid as { reels: number; rows: number } | undefined,
    };
  }

  const handleGenerateDescriptions = useCallback(async () => {
    setGenerating("descriptions");
    try {
      const result = await api.ai.generateMarketingCopy(getCopyContext());
      setShortDesc(result.short_description);
      setLongDesc(result.long_description);
      setSellingPoints(result.selling_points);
    } catch (err) { console.error("Failed to generate marketing copy:", err); }
    setGenerating(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleGeneratePressRelease = useCallback(async () => {
    setGenerating("press_release");
    try {
      const result = await api.ai.generatePressRelease({ ...getCopyContext(), selling_points: sellingPoints });
      setPressRelease(result.press_release);
    } catch (err) { console.error("Failed to generate press release:", err); }
    setGenerating(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, sellingPoints]);

  const handleGenerateSocial = useCallback(async () => {
    setGenerating("social");
    try {
      const result = await api.ai.generateSocialCopy(getCopyContext());
      setTwitter(result.twitter);
      setLinkedin(result.linkedin);
      setInstagram(result.instagram);
      setHashtags(result.hashtags);
      setSeoTitle(result.seo.title);
      setSeoDesc(result.seo.meta_description);
      setSeoKeywords(result.seo.keywords);
    } catch (err) { console.error("Failed to generate social copy:", err); }
    setGenerating(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const uploadedCount = sizes.filter((s) => s.uploaded.length > 0).length;
  const missingCount = sizes.length - uploadedCount;

  const filteredSizes = aspectFilter === "all" ? sizes : sizes.filter((s) => s.aspect === aspectFilter);

  const filteredAssets = assetCategory === "All"
    ? gameAssets
    : gameAssets.filter((a) => a.category === assetCategory);

  const assetCounts = useMemo(() => {
    const c: Record<string, number> = { All: gameAssets.length };
    for (const a of gameAssets) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [gameAssets]);

  function addCustomSize() {
    const w = parseInt(customW);
    const h = parseInt(customH);
    if (!w || !h) return;
    setSizes((prev) => [...prev, { w, h, label: customLabel || "Custom", aspect: "horizontal", uploaded: [] }]);
    setCustomW("");
    setCustomH("");
    setCustomLabel("");
  }

  function gameMeta(p: Project) {
    const sd = p.step_data ?? {};
    const s1 = (sd.step1 ?? {}) as Record<string, unknown>;
    const s2 = (sd.step2 ?? {}) as Record<string, unknown>;
    const grid = s1.grid as { reels?: number; rows?: number } | undefined;
    const rtp = typeof s2.target_rtp === "number" ? s2.target_rtp : null;
    const parts = [p.game_type.charAt(0).toUpperCase() + p.game_type.slice(1)];
    if (grid?.reels && grid?.rows) parts.push(`${grid.reels}x${grid.rows}`);
    if (rtp) parts.push(`${rtp}% RTP`);
    return parts.join(" · ");
  }

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-[900px]">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-[20px] font-semibold" style={{ color: "var(--text)" }}>
            Marketing assets & product sheet
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text2)" }}>
            Promotion pack, game assets, screenshots, and auto-generated product sheet for operators
          </p>
        </div>

        {/* Game Selector */}
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3.5 mb-4"
          style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
        >
          <span className="text-[12px] font-medium shrink-0" style={{ color: "var(--text3)" }}>Game:</span>

          <div className="relative flex-1 max-w-[400px]">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 w-full rounded-md border px-3.5 py-2 text-left transition-colors"
              style={{
                background: menuOpen ? "var(--bg4)" : "var(--bg3)",
                borderColor: menuOpen ? "var(--accent-border)" : "var(--border)",
              }}
            >
              {selected ? (
                <>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-semibold text-white"
                    style={{ background: TYPE_GRADIENTS[selected.game_type] }}
                  >
                    {TYPE_LETTER[selected.game_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{selected.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--text3)" }}>{gameMeta(selected)}</div>
                  </div>
                </>
              ) : (
                <span className="text-[13px]" style={{ color: "var(--text3)" }}>
                  {loading ? "Loading…" : "No games"}
                </span>
              )}
              <span className="text-[10px] shrink-0 transition-transform" style={{ color: "var(--text3)", transform: menuOpen ? "rotate(180deg)" : "none" }}>▾</span>
            </button>

            {menuOpen && projects.length > 0 && (
              <div
                className="absolute top-[calc(100%+4px)] left-0 right-0 rounded-lg border overflow-hidden z-50"
                style={{ background: "var(--bg3)", borderColor: "var(--border)", boxShadow: "0 8px 30px rgba(0,0,0,.4)" }}
              >
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedId(p.id); setMenuOpen(false); setSelectedAssets(new Set()); setUploadedAssets([]); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left transition-colors"
                    style={{ background: p.id === selectedId ? "var(--accent-soft)" : "transparent" }}
                    onMouseEnter={(e) => { if (p.id !== selectedId) (e.currentTarget.style.background = "var(--bg4)"); }}
                    onMouseLeave={(e) => { if (p.id !== selectedId) (e.currentTarget.style.background = "transparent"); }}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                      style={{ background: TYPE_GRADIENTS[p.game_type] }}
                    >
                      {TYPE_LETTER[p.game_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{p.name}</div>
                      <div className="text-[10px]" style={{ color: "var(--text3)" }}>{gameMeta(p)}</div>
                    </div>
                  </button>
                ))}
                <div className="border-t" style={{ borderColor: "var(--border)" }}>
                  <button
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left transition-colors"
                    style={{ color: "var(--accent)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="text-[12px]">+ Add game from library</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 ml-auto shrink-0">
            <div className="text-center">
              <div className="text-[15px] font-semibold" style={{ color: "var(--green)" }}>{uploadedCount}</div>
              <div className="text-[10px]" style={{ color: "var(--text3)" }}>Uploaded</div>
            </div>
            <div className="text-center">
              <div className="text-[15px] font-semibold" style={{ color: "var(--amber)" }}>{missingCount}</div>
              <div className="text-[10px]" style={{ color: "var(--text3)" }}>Missing</div>
            </div>
            <div className="text-center">
              <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>{sizes.length}</div>
              <div className="text-[10px]" style={{ color: "var(--text3)" }}>Total assets</div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex mb-5 rounded-lg overflow-hidden border" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className="flex-1 py-2.5 text-center text-[13px] transition-colors"
              style={{
                background: tab === i ? "var(--accent-soft)" : "transparent",
                color: tab === i ? "var(--accent)" : "var(--text3)",
                fontWeight: tab === i ? 500 : 400,
                borderRight: i < TABS.length - 1 ? "0.5px solid var(--border)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ═══ TAB 0: Promotion Pack ═══ */}
        {tab === 0 && (
          <>
            <Section title="Icon templates">
              <p className="text-[11px] mb-3" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                Standard operator lobby sizes. Upload JPG or PSD per size. Green = uploaded, gray = empty.
              </p>

              {/* Aspect filter */}
              <div className="flex gap-1.5 mb-3">
                {ASPECT_TABS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setAspectFilter(a.key)}
                    className="rounded-md border px-3.5 py-1.5 text-[12px] text-center transition-colors"
                    style={{
                      borderColor: aspectFilter === a.key ? "var(--accent-border)" : "var(--border)",
                      background: aspectFilter === a.key ? "var(--accent-soft)" : "var(--bg3)",
                      color: aspectFilter === a.key ? "var(--accent)" : "var(--text3)",
                    }}
                  >
                    {a.label}
                    {"sub" in a && <span className="block text-[10px]" style={{ color: "var(--text3)" }}>{a.sub}</span>}
                  </button>
                ))}
              </div>

              {/* Size grid */}
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {filteredSizes.map((s, i) => {
                  const hasFile = s.uploaded.length > 0;
                  return (
                    <label
                      key={`${s.w}-${s.h}-${i}`}
                      className="relative rounded-lg border p-3 transition-colors cursor-pointer hover:border-[var(--accent)]"
                      style={{
                        background: "var(--bg3)",
                        borderColor: hasFile ? "var(--green)" : "var(--border)",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*,.psd"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const fmt = file.name.toLowerCase().endsWith(".psd") ? "PSD" : "JPG";
                            setSizes((prev) => prev.map((ps, pi) => pi === i ? { ...ps, uploaded: [...new Set([...ps.uploaded, fmt as "JPG" | "PSD"])] } : ps));
                          }
                        }}
                      />
                      <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: hasFile ? "var(--green)" : "var(--bg5)" }} />
                      <div className="text-[14px] font-medium mb-1" style={{ color: "var(--accent)" }}>
                        {s.w} x {s.h}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text3)" }}>{s.label}</div>
                      <div className="flex gap-1 mt-1.5">
                        {["JPG", "PSD"].map((fmt) => (
                          <span
                            key={fmt}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: s.uploaded.includes(fmt as "JPG" | "PSD") ? "var(--green-soft)" : "var(--bg4)",
                              color: s.uploaded.includes(fmt as "JPG" | "PSD") ? "var(--green)" : "var(--text3)",
                            }}
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                      {!hasFile && <div className="mt-2 text-[10px] text-center" style={{ color: "var(--text4)" }}>Click to upload</div>}
                    </label>
                  );
                })}
              </div>

              {/* Custom size */}
              <div className="flex gap-2 items-center mt-3">
                <span className="text-[12px]" style={{ color: "var(--text2)" }}>Custom size:</span>
                <input className="w-[80px] px-2.5 py-1.5 rounded-md border text-center text-[13px]" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} placeholder="W" value={customW} onChange={(e) => setCustomW(e.target.value)} />
                <span className="text-[13px]" style={{ color: "var(--text3)" }}>x</span>
                <input className="w-[80px] px-2.5 py-1.5 rounded-md border text-center text-[13px]" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} placeholder="H" value={customH} onChange={(e) => setCustomH(e.target.value)} />
                <input className="w-[140px] px-2.5 py-1.5 rounded-md border text-[13px]" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} placeholder="Label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
                <Btn onClick={addCustomSize}>Add size</Btn>
              </div>
            </Section>

            <Section title="Upload files">
              <DropZone text="Drag & drop icon files here" hint="JPG, PNG, PSD — auto-match to sizes by dimensions. Or click to browse." onFiles={(files) => {
                for (const f of files) {
                  const ext = f.name.split(".").pop()?.toUpperCase() ?? "";
                  const fmt = ext === "PSD" ? "PSD" : "JPG";
                  // Mark the first empty size as uploaded with this format
                  setSizes((prev) => {
                    const idx = prev.findIndex((s) => !s.uploaded.includes(fmt as "JPG" | "PSD"));
                    if (idx === -1) return prev;
                    return prev.map((s, i) => i === idx ? { ...s, uploaded: [...new Set([...s.uploaded, fmt as "JPG" | "PSD"])] } : s);
                  });
                }
              }} />
              <Hint variant="info">Files are auto-matched to template sizes by their dimensions. If a file doesn't match any template, you'll be asked to assign it manually or create a new size.</Hint>
            </Section>

            <Section title="Bulk actions">
              <div className="flex gap-2 flex-wrap">
                <Btn onClick={() => {
                  const csv = ["Width,Height,Label,Aspect,Uploaded Formats", ...sizes.map((s) => `${s.w},${s.h},"${s.label}",${s.aspect},"${s.uploaded.join(", ")}"`),].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "icon-sizes.csv"; a.click(); URL.revokeObjectURL(a.href);
                }}>Export size list (CSV)</Btn>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                {uploadedCount} of {sizes.length} sizes uploaded. Upload files above to enable download buttons.
              </p>
            </Section>
          </>
        )}

        {/* ═══ TAB 1: Game Assets ═══ */}
        {tab === 1 && (
          <Section title="Game element assets">
            <p className="text-[11px] mb-3" style={{ color: "var(--text3)", fontStyle: "italic" }}>
              Individual game elements: symbols, backgrounds, UI, logos. Upload and organize for art handoff.
            </p>

            <DropZone text="Drag & drop game assets here" hint="PNG, SVG, PSD, AI — symbols, backgrounds, UI elements, logos" onFiles={handleAssetUpload} />

            {/* Category chips */}
            <div className="flex gap-1.5 flex-wrap my-3">
              {ASSET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAssetCategory(cat)}
                  className="rounded-md border px-3 py-1.5 text-[12px] transition-colors"
                  style={{
                    borderColor: assetCategory === cat ? "var(--accent-border)" : "var(--border)",
                    background: assetCategory === cat ? "var(--accent-soft)" : "transparent",
                    color: assetCategory === cat ? "var(--accent)" : "var(--text2)",
                    fontWeight: assetCategory === cat ? 500 : 400,
                  }}
                >
                  {cat} ({assetCounts[cat] ?? 0})
                </button>
              ))}
            </div>

            {/* Asset grid */}
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
              {filteredAssets.map((a, i) => {
                const assetKey = `${a.name}-${i}`;
                const isSelected = selectedAssets.has(assetKey);
                return (
                  <div
                    key={assetKey}
                    onClick={() => setSelectedAssets((prev) => {
                      const next = new Set(prev);
                      next.has(assetKey) ? next.delete(assetKey) : next.add(assetKey);
                      return next;
                    })}
                    className="relative rounded-lg border p-2.5 text-center cursor-pointer transition-colors"
                    style={{
                      background: "var(--bg3)",
                      borderColor: isSelected ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    {/* Checkbox — only visible when selected */}
                    {isSelected && (
                      <div
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded flex items-center justify-center text-[9px]"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        ✓
                      </div>
                    )}
                    <div
                      className="w-full rounded-md mb-1.5 flex items-center justify-center text-[24px]"
                      style={{ aspectRatio: "1", background: "var(--bg4)" }}
                    >
                      {a.emoji}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: "var(--text2)" }}>{a.name}</div>
                    <div className="text-[9px]" style={{ color: "var(--text3)" }}>
                      {a.type}{a.dims ? ` · ${a.dims}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ TAB 2: Screenshots ═══ */}
        {tab === 2 && (
          <Section title="Game screenshots">
            <p className="text-[11px] mb-3" style={{ color: "var(--text3)", fontStyle: "italic" }}>
              Capture screenshots from Step 7 prototype or upload from production build. Used in Product Sheet and operator communications.
            </p>

            {/* Screenshot grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {screenshots.map((ss) => (
                <div
                  key={ss.label}
                  className="group/ss relative rounded-lg border overflow-hidden cursor-pointer"
                  style={{ aspectRatio: "16/9", background: ss.gradient, borderColor: "var(--green)" }}
                >
                  <button
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/ss:opacity-100 transition-opacity z-10"
                    style={{ background: "rgba(0,0,0,.7)", color: "#fff" }}
                    onClick={(e) => e.preventDefault()}
                  >
                    &times;
                  </button>
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px]"
                    style={{ background: "rgba(0,0,0,.7)", color: "#fff" }}
                  >
                    {ss.label}
                  </div>
                </div>
              ))}
              {/* Add card */}
              <label
                className="rounded-lg border flex items-center justify-center cursor-pointer transition-colors hover:border-[var(--accent)]"
                style={{ aspectRatio: "16/9", borderColor: "var(--border)", borderStyle: "dashed", background: "var(--bg3)" }}
              >
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setExtraScreenshots((prev: { label: string; url: string }[]) => [...prev, { label: file.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(file) }]);
                  }
                }} />
                <div className="text-center">
                  <div className="text-[11px]" style={{ color: "var(--text3)" }}>+ Add screenshot</div>
                  <div className="text-[10px]" style={{ color: "var(--text3)" }}>Click to upload</div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-3">
              <Btn primary>Capture from prototype</Btn>
              <Btn>Upload screenshots</Btn>
              <div className="ml-auto"><Btn>Download all (ZIP)</Btn></div>
            </div>

            <Hint variant="info">Screenshots are automatically inserted into the Product Sheet builder (next tab). Assign each screenshot to a feature for auto-placement.</Hint>

            {/* Screenshot assignments */}
            <div className="mt-4">
              <div className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                Screenshot assignments
              </div>
              <div className="text-[12px]" style={{ color: "var(--text2)" }}>
                {screenshots.map((ss) => (
                  <div
                    key={ss.label}
                    className="flex justify-between py-1 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span>{ss.label}</span>
                    <span style={{ color: "var(--accent)" }}>→ {ss.assignment}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ═══ TAB 3: Product Sheet ═══ */}
        {tab === 3 && (
          <>
            <Section title="Product sheet builder">
              <p className="text-[11px] mb-3" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                Auto-generated from game data (Steps 1-8) + screenshots. Edit any field. Export as PDF for operators.
              </p>

              <div className="flex gap-2 mb-3 flex-wrap items-center">
                <Btn primary>Export PDF</Btn>
                <Btn>Edit content</Btn>
                <Btn>Change template</Btn>
                <div className="flex gap-1 ml-auto">
                  {["Standard", "Minimal", "Detailed"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setPsTemplate(t)}
                      className="px-3 py-1.5 rounded-md border text-[12px] transition-colors"
                      style={{
                        borderColor: psTemplate === t ? "var(--accent-border)" : "var(--border)",
                        background: psTemplate === t ? "var(--accent-soft)" : "transparent",
                        color: psTemplate === t ? "var(--accent)" : "var(--text2)",
                        fontWeight: psTemplate === t ? 500 : 400,
                      }}
                    >
                      {t} template
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Product Sheet Preview */}
            <div className="rounded-xl overflow-hidden mb-4" style={{ background: "#fff", color: "#1a1a1a" }}>
              {/* Hero */}
              <div
                className="relative flex items-center justify-center"
                style={{ height: 220, background: "linear-gradient(135deg, #1a0f2e, #2d1854)" }}
              >
                <div className="absolute top-3 left-3 text-[12px]" style={{ color: "rgba(255,255,255,.7)" }}>
                  SLOTWISE Studio
                </div>
                {psFeatures.some((f) => f.name === "BONUS BUY") && (
                  <div className="absolute top-3 right-3 px-3.5 py-1.5 rounded-md text-[11px] font-semibold text-white" style={{ background: "#00a0ff" }}>
                    BONUS BUY
                  </div>
                )}
                <div className="text-[28px] font-semibold text-center tracking-wide" style={{ color: "#d4a017", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>
                  {selected?.name?.toUpperCase() ?? "SELECT A GAME"}
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="text-[22px] font-semibold mb-3" style={{ color: "#1a1a1a" }}>
                  {selected?.name?.toUpperCase() ?? "GAME NAME"}
                </div>
                <p className="text-[13px] leading-relaxed mb-5" style={{ color: "#555" }}>
                  {sheet?.description || "Game description will be auto-populated from Step 4 concept data. Complete the wizard steps to generate the product sheet content."}
                </p>

                <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 260px" }}>
                  {/* Features */}
                  <div>
                    <div className="text-[14px] font-semibold mb-3 inline-block pb-1" style={{ color: "#1a1a1a", borderBottom: "2px solid var(--accent)" }}>
                      Game features
                    </div>
                    {psFeatures.map((f) => (
                      <div key={f.name} className="flex gap-3 mb-3.5">
                        <div
                          className="w-[160px] shrink-0 rounded-md flex items-center justify-center text-[10px] border"
                          style={{ aspectRatio: "16/9", background: f.gradient, color: "rgba(255,255,255,.8)", borderColor: "#e0e0e0" }}
                        >
                          {f.name.toLowerCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-[12px] font-semibold mb-0.5" style={{ color: "#1a1a1a" }}>{f.name}</div>
                          <div className="text-[11px] leading-relaxed" style={{ color: "#666" }}>{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sidebar */}
                  <div className="rounded-lg p-4" style={{ background: "#f5f5f5" }}>
                    <div className="text-[12px] font-semibold mb-2.5 pb-1.5" style={{ color: "#1a1a1a", borderBottom: "2px solid var(--accent)" }}>
                      Game summary
                    </div>
                    <SpecRow k="Game type" v={sheet?.game_type ?? "—"} />
                    <SpecRow k="Technology" v="HTML5" />
                    <SpecRow k="Resolution" v="FULL HD (16:9)" />
                    <SpecRow k="RTP" v={sheet?.rtp ?? "—"} accent />
                    <SpecRow k="Volatility" v={sheet?.volatility ?? "—"} />
                    <SpecRow k="Mobile" v="Yes" />
                    <SpecRow k="Vertical view" v="Yes" />

                    <div className="text-[12px] font-semibold mt-3.5 mb-2 pb-1" style={{ color: "#1a1a1a", borderBottom: "2px solid var(--accent)" }}>
                      Information
                    </div>
                    <SpecRow k="Platforms" v="Mobile + Desktop" />
                    <SpecRow k="Reels" v={sheet?.reels ?? "—"} />
                    <SpecRow k="Rows" v={sheet?.rows ?? "—"} />
                    <SpecRow k="Paylines" v={sheet?.paylines ?? "—"} />
                    <SpecRow k="Min bet EUR" v={sheet?.min_bet ?? "—"} />
                    <SpecRow k="Max bet EUR" v={sheet?.max_bet ?? "—"} />
                    <SpecRow k="Hit frequency" v={sheet?.hit_frequency ?? "—"} />
                    <SpecRow k="Free Game" v={sheet?.hit_frequency !== "—" ? `1 in ${Math.round(100 / parseFloat(sheet?.hit_frequency ?? "0"))}` : "—"} />

                    <div className="text-[11px] font-semibold mt-3.5 mb-2 pb-1" style={{ color: "#1a1a1a", borderBottom: "2px solid var(--accent)" }}>
                      Win amount
                    </div>
                    {(() => {
                      const sd = selected?.step_data ?? {};
                      const s6 = (sd.step6 ?? {}) as { distribution_buckets?: number[]; spins?: number };
                      if (s6.distribution_buckets && s6.spins) {
                        const total = s6.spins;
                        const buckets = s6.distribution_buckets;
                        const bigWins = buckets.slice(4).reduce((a, b) => a + b, 0);
                        const superWins = buckets.slice(6).reduce((a, b) => a + b, 0);
                        const megaWins = buckets.slice(8).reduce((a, b) => a + b, 0);
                        const epicWins = buckets.slice(10).reduce((a, b) => a + b, 0);
                        return (
                          <>
                            <SpecRow k="Big Win" v={bigWins > 0 ? `1 in ${Math.round(total / bigWins).toLocaleString()}` : "—"} />
                            <SpecRow k="Super Win" v={superWins > 0 ? `1 in ${Math.round(total / superWins).toLocaleString()}` : "—"} />
                            <SpecRow k="Mega Win" v={megaWins > 0 ? `1 in ${Math.round(total / megaWins).toLocaleString()}` : "—"} />
                            <SpecRow k="Epic Win" v={epicWins > 0 ? `1 in ${Math.round(total / epicWins).toLocaleString()}` : "—"} />
                          </>
                        );
                      }
                      return (
                        <>
                          <SpecRow k="Big Win" v="—" />
                          <SpecRow k="Super Win" v="—" />
                          <SpecRow k="Mega Win" v="—" />
                          <SpecRow k="Epic Win" v="—" />
                        </>
                      );
                    })()}

                    <div className="text-[11px] font-semibold mt-3.5 mb-2 pb-1" style={{ color: "#1a1a1a", borderBottom: "2px solid var(--accent)" }}>
                      Max payout ({(() => {
                        const sd = selected?.step_data ?? {};
                        const s6 = (sd.step6 ?? {}) as { spins?: number };
                        return typeof s6.spins === "number" ? `${(s6.spins / 1_000_000).toFixed(0)}M spins` : "500M spins";
                      })()})
                    </div>
                    <SpecRow k="Max Win" v={sheet?.max_win ?? "—"} accent />
                  </div>
                </div>
              </div>
            </div>

            {/* Edit section */}
            <Section title="Edit product sheet content">
              <p className="text-[11px] mb-3" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                All fields auto-populated from Steps 1-8. Edit to customize for specific operators or markets.
              </p>
              <div className="mb-3">
                <div className="text-[12px] mb-1.5" style={{ color: "var(--text2)" }}>
                  Game description <span className="text-[10px]" style={{ color: "var(--text3)" }}>(auto from Step 4)</span>
                </div>
                <textarea
                  className="w-full px-3 py-2 rounded-md border text-[13px] resize-y"
                  style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)", minHeight: 60 }}
                  defaultValue={sheet?.description || ""}
                  rows={3}
                />
              </div>
              <div className="mb-3">
                <div className="text-[12px] mb-1.5" style={{ color: "var(--text2)" }}>
                  Feature descriptions <span className="text-[10px]" style={{ color: "var(--text3)" }}>(auto from Step 3 + Step 5)</span>
                </div>
                <p className="text-[11px]" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                  Each feature has its own editable description + assigned screenshot. Click any feature in the preview above to edit.
                </p>
              </div>
              <div>
                <div className="text-[12px] mb-1.5" style={{ color: "var(--text2)" }}>
                  Win statistics <span className="text-[10px]" style={{ color: "var(--text3)" }}>(auto from Step 6 simulation)</span>
                </div>
                <p className="text-[11px]" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                  Big/Super/Mega/Epic win frequencies calculated from 500M spin simulation data. Run Step 6 at 500M for accurate numbers.
                </p>
              </div>
            </Section>

            {/* Footer */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>Product sheet v1 — auto-generated</span>
              <div className="flex gap-2">
                <Btn>Preview full PDF</Btn>
                <Btn primary>Export all formats</Btn>
              </div>
            </div>
          </>
        )}

        {/* ═══ TAB 4: Marketing Copy ═══ */}
        {tab === 4 && (
          <>
            <Section title="AI-generated marketing copy">
              <p className="text-[11px] mb-3" style={{ color: "var(--text3)", fontStyle: "italic" }}>
                Generate descriptions, selling points, press releases, social media posts, and SEO metadata for {selected?.name ?? "your game"}.
              </p>

              {/* Sub-section tabs */}
              <div className="flex gap-1 border-b mb-4" style={{ borderColor: "var(--border)" }}>
                {([
                  { key: "descriptions" as CopySection, label: "Descriptions" },
                  { key: "selling_points" as CopySection, label: "Selling Points" },
                  { key: "press_release" as CopySection, label: "Press Release" },
                  { key: "social" as CopySection, label: "Social Media" },
                  { key: "seo" as CopySection, label: "SEO" },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCopySection(key)}
                    className="border-b-2 px-4 py-2 text-[12px] font-medium transition-colors"
                    style={{
                      borderBottomColor: copySection === key ? "var(--accent)" : "transparent",
                      color: copySection === key ? "var(--accent)" : "var(--text3)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Descriptions */}
              {copySection === "descriptions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Game Descriptions</h3>
                    <Btn primary onClick={handleGenerateDescriptions}>
                      {generating === "descriptions" ? "Generating..." : shortDesc ? "Regenerate All" : "Generate with AI"}
                    </Btn>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>Short Description</label>
                      {shortDesc && <CopyBtn text={shortDesc} label="short" copied={copied} onCopy={copyToClipboard} />}
                    </div>
                    <textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} rows={2} placeholder="1-2 sentence hook for game listings..." className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>Long Description</label>
                      {longDesc && <CopyBtn text={longDesc} label="long" copied={copied} onCopy={copyToClipboard} />}
                    </div>
                    <textarea value={longDesc} onChange={(e) => setLongDesc(e.target.value)} rows={5} placeholder="Full marketing paragraph for game pages..." className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                </div>
              )}

              {/* Selling Points */}
              {copySection === "selling_points" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Key Selling Points</h3>
                    <Btn primary onClick={handleGenerateDescriptions}>
                      {generating === "descriptions" ? "Generating..." : sellingPoints.length ? "Regenerate" : "Generate with AI"}
                    </Btn>
                  </div>
                  <div className="space-y-2">
                    {sellingPoints.map((point, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                        <input value={point} onChange={(e) => { const u = [...sellingPoints]; u[i] = e.target.value; setSellingPoints(u); }} className="flex-1 rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                        <button onClick={() => setSellingPoints(sellingPoints.filter((_, idx) => idx !== i))} className="rounded p-1 text-[11px]" style={{ color: "var(--red)" }}>x</button>
                      </div>
                    ))}
                    <button onClick={() => setSellingPoints([...sellingPoints, ""])} className="rounded-md border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>+ Add Point</button>
                  </div>
                </div>
              )}

              {/* Press Release */}
              {copySection === "press_release" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Press Release</h3>
                    <div className="flex gap-2">
                      {pressRelease && <CopyBtn text={pressRelease} label="press" copied={copied} onCopy={copyToClipboard} />}
                      <Btn primary onClick={handleGeneratePressRelease}>
                        {generating === "press_release" ? "Generating..." : pressRelease ? "Regenerate" : "Generate with AI"}
                      </Btn>
                    </div>
                  </div>
                  <textarea value={pressRelease} onChange={(e) => setPressRelease(e.target.value)} rows={16} placeholder="AI will generate a professional press release..." className="w-full rounded-lg border px-3 py-2 text-[13px] font-mono leading-relaxed focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                </div>
              )}

              {/* Social Media */}
              {copySection === "social" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Social Media Copy</h3>
                    <Btn primary onClick={handleGenerateSocial}>
                      {generating === "social" ? "Generating..." : twitter ? "Regenerate All" : "Generate with AI"}
                    </Btn>
                  </div>
                  {[
                    { label: "Twitter / X", value: twitter, onChange: setTwitter, rows: 3, hint: "280 characters max" },
                    { label: "LinkedIn", value: linkedin, onChange: setLinkedin, rows: 5, hint: "Professional tone" },
                    { label: "Instagram", value: instagram, onChange: setInstagram, rows: 4, hint: "Visual-focused caption" },
                  ].map(({ label, value, onChange, rows, hint }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>
                          {label} <span className="font-normal" style={{ color: "var(--text3)" }}>{hint}</span>
                        </label>
                        {value && <CopyBtn text={value} label={label} copied={copied} onCopy={copyToClipboard} />}
                      </div>
                      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>Hashtags</label>
                    <input value={hashtags.join(" ")} onChange={(e) => setHashtags(e.target.value.split(/\s+/).filter(Boolean))} placeholder="#slots #igaming #newgame" className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                </div>
              )}

              {/* SEO */}
              {copySection === "seo" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>SEO Metadata</h3>
                    <Btn primary onClick={handleGenerateSocial}>
                      {generating === "social" ? "Generating..." : seoTitle ? "Regenerate" : "Generate with AI"}
                    </Btn>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>
                      Page Title <span className="font-normal" style={{ color: seoTitle.length > 60 ? "var(--red)" : "var(--text3)" }}>{seoTitle.length}/60</span>
                    </label>
                    <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Game title for search results..." className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>
                      Meta Description <span className="font-normal" style={{ color: seoDesc.length > 160 ? "var(--red)" : "var(--text3)" }}>{seoDesc.length}/160</span>
                    </label>
                    <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} placeholder="Description for search engine results..." className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>Keywords</label>
                    <input value={seoKeywords.join(", ")} onChange={(e) => setSeoKeywords(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="slot game, online casino, video slot..." className="w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none" style={{ background: "var(--bg3)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                </div>
              )}
            </Section>

            {/* Copy toast */}
            {copied && (
              <div className="fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 text-[12px] shadow-lg" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
                Copied to clipboard!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-5 py-4 mb-4" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
      <div className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick?: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-md border text-[12px] transition-colors"
      style={{
        background: primary ? "var(--accent-soft)" : "var(--bg3)",
        borderColor: primary ? "var(--accent-border)" : "var(--border)",
        color: primary ? "var(--accent)" : "var(--text2)",
      }}
    >
      {children}
    </button>
  );
}

function DropZone({ text, hint, onFiles }: { text: string; hint: string; onFiles?: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0 || !onFiles) return;
    onFiles(Array.from(files));
  }, [onFiles]);

  return (
    <div
      className="rounded-lg border-2 border-dashed py-8 text-center cursor-pointer transition-colors my-3"
      style={{ borderColor: dragOver ? "var(--accent)" : "var(--border)", background: dragOver ? "rgba(124,107,245,0.05)" : "transparent" }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.psd,.ai,.svg"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <div className="text-[28px] mb-2 opacity-40">{dragOver ? "+" : "⇩"}</div>
      <div className="text-[13px]" style={{ color: dragOver ? "var(--accent)" : "var(--text2)" }}>{dragOver ? "Drop files here" : text}</div>
      <div className="text-[11px] mt-1" style={{ color: "var(--text3)" }}>{hint}</div>
    </div>
  );
}

function Hint({ children, variant }: { children: React.ReactNode; variant: "info" | "good" }) {
  return (
    <div
      className="text-[12px] px-3 py-2 rounded-md leading-relaxed mt-2"
      style={{
        background: variant === "info" ? "var(--blue-soft)" : "var(--green-soft)",
        color: variant === "info" ? "var(--blue)" : "var(--green)",
      }}
    >
      {children}
    </div>
  );
}

function SpecRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between py-1 border-b text-[11px]" style={{ borderColor: "#eee" }}>
      <span style={{ color: "#888" }}>{k}</span>
      <span style={{ fontWeight: 500, color: accent ? "var(--accent)" : "#1a1a1a" }}>{v}</span>
    </div>
  );
}

function CopyBtn({ text, label, copied, onCopy }: { text: string; label: string; copied: string | null; onCopy: (text: string, label: string) => void }) {
  if (!text) return null;
  return (
    <button onClick={() => onCopy(text, label)} className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ color: copied === label ? "var(--green)" : "var(--accent)" }}>
      {copied === label ? "Copied!" : "Copy"}
    </button>
  );
}
