"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import type { SaturationResult, HolisticSymbolReview } from "@/lib/api";
import type {
  Step4Data,
  ConceptBrief,
  ConceptCard,
  SelectedConcept,
  ThemeData,
  NamingData,
  SymbolDef,
  ArtDirection,
} from "@/lib/wizard-types";

interface Props {
  data?: Step4Data;
  onUpdate: (data: Step4Data) => void;
  onBack: () => void;
  /** Steps 1-3 context for AI enrichment */
  gameContext?: {
    game_type?: string;
    variant?: string;
    grid?: { reels: number; rows: number };
    volatility?: string;
    target_rtp?: number;
    features?: string[];
  };
}

const AUDIENCES = ["eu_mainstream", "asia_vip", "latam_casual", "na_mainstream", "nordic"];

const DEFAULT_EMOJIS: Record<string, string> = {
  wild: "⭐",
  scatter: "💎",
  hp1: "🐉",
  hp2: "🗡️",
  hp3: "🏛️",
  hp4: "👑",
  lp1: "🃏",
  lp2: "♠️",
  lp3: "♥️",
  lp4: "♦️",
  lp5: "♣️",
  lp6: "🔮",
};

const EMOJI_PICKER = [
  "⭐", "💎", "🐉", "🗡️", "🏛️", "👑", "🃏", "♠️", "♥️", "♦️", "♣️", "🔮",
  "🦅", "🐅", "🦁", "🐺", "🦇", "🐍", "🐙", "🦈", "🎭", "🏺", "⚡", "🔥",
  "💀", "🌙", "☀️", "🌸", "🍀", "💰", "🎲", "⚔️",
];

const DEFAULT_BRIEF: ConceptBrief = {
  theme_input: "",
  creative_direction: "",
  audience: [],
  mood: [],
  references: [],
};

const DEFAULT_THEME: ThemeData = {
  description: "",
  usp_detail: "",
  bonus_narrative: "",
};

const DEFAULT_NAMING: NamingData = {
  selected: "",
  alternatives: [],
  reasoning: {},
  localization: {},
};

const DEFAULT_ART: ArtDirection = {
  style: "",
  palette: ["#1a0f2e", "#2d1854", "#d4a017", "#8b5cf6", "#e8d5b7", "#c41e3a"],
  sound: {
    ambient: "",
    spin: "",
    win: "",
    bonus_trigger: "",
    cascade: "",
    max_win: "",
  },
};

const DEFAULT_SYMBOLS: SymbolDef[] = [
  { id: "wild", name: "Wild", role: "wild", emoji: "⭐" },
  { id: "scatter", name: "Scatter", role: "scatter", emoji: "💎" },
  { id: "hp1", name: "High Pay 1", role: "high_pay", emoji: "🐉" },
  { id: "hp2", name: "High Pay 2", role: "high_pay", emoji: "🗡️" },
  { id: "hp3", name: "High Pay 3", role: "high_pay", emoji: "🏛️" },
  { id: "hp4", name: "High Pay 4", role: "high_pay", emoji: "👑" },
  { id: "lp1", name: "Low Pay 1", role: "low_pay", emoji: "🃏" },
  { id: "lp2", name: "Low Pay 2", role: "low_pay", emoji: "♠️" },
  { id: "lp3", name: "Low Pay 3", role: "low_pay", emoji: "♥️" },
  { id: "lp4", name: "Low Pay 4", role: "low_pay", emoji: "♦️" },
  { id: "lp5", name: "Low Pay 5", role: "low_pay", emoji: "♣️" },
  { id: "lp6", name: "Low Pay 6", role: "low_pay", emoji: "🔮" },
];

function initStep4(existing?: Step4Data): Step4Data {
  if (existing) return existing;
  return {
    sub_steps_complete: [false, false, false, false, false, false],
    brief: { ...DEFAULT_BRIEF },
    concepts: [],
    selected_concept: null,
    theme: { ...DEFAULT_THEME },
    naming: { ...DEFAULT_NAMING },
    symbols: DEFAULT_SYMBOLS.map((s) => ({ ...s })),
    art_direction: {
      ...DEFAULT_ART,
      sound: { ...DEFAULT_ART.sound },
      palette: [...DEFAULT_ART.palette],
    },
  };
}

export function Step4Concept({ data, onUpdate, onBack, gameContext }: Props) {
  const [local, setLocal] = useState<Step4Data>(() => initStep4(data));
  const [refInput, setRefInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [saturation, setSaturation] = useState<SaturationResult | null>(null);
  const [satLoading, setSatLoading] = useState(false);
  const [holisticReview, setHolisticReview] = useState<HolisticSymbolReview | null>(null);
  const [themeReasoning, setThemeReasoning] = useState<string[]>([]);
  const [iterInput, setIterInput] = useState("");
  const [emojiPicker, setEmojiPicker] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    onUpdate(local);
  }, [local, onUpdate]);

  async function handleIterate() {
    if (!iterInput.trim() || loading) return;
    setLoading(true);
    try {
      const result = await api.ai.iterateTheme(iterInput, local.theme, {
        game_type: gameContext?.game_type,
        features: gameContext?.features,
      });
      setLocal({ ...local, theme: result.theme });
      setThemeReasoning(result.reasoning || []);
      setIterInput("");
    } catch {
      setLocal({
        ...local,
        theme: {
          ...local.theme,
          description: `${local.theme.description} [${iterInput}]`,
        },
      });
      setIterInput("");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateConcepts() {
    setLoading(true);
    try {
      const result = await api.ai.generateConcepts(local.brief, gameContext);
      setAiSource(result.source);
      setLocal({ ...local, concepts: result.concepts });
    } catch {
      const theme = local.brief.theme_input || "Mystical Adventure";
      const fallback: ConceptCard[] = [
        { name: `${theme} Rising`, usp: "Check your AI connection.", description: `AI-generated concepts unavailable. Configure your Anthropic API key in Settings.`, reasoning: "—", market_context: "—", badge: "Offline", score: 0 },
      ];
      setAiSource("offline");
      setLocal({ ...local, concepts: fallback });
    } finally {
      setLoading(false);
    }
  }

  // When a concept is selected, auto-populate theme and naming
  function selectConcept(concept: SelectedConcept) {
    const updates: Partial<Step4Data> = { selected_concept: concept };
    if (concept.name && concept.usp) {
      updates.theme = {
        description: `${local.brief.theme_input} — ${concept.usp}`,
        usp_detail: concept.usp,
        bonus_narrative: local.theme.bonus_narrative || "",
      };
      updates.naming = {
        ...local.naming,
        selected: concept.name,
        alternatives: local.concepts.map((c) => c.name),
      };
    }
    setLocal({ ...local, ...updates });
  }

  // ── Naming validation ──
  const nameLen = local.naming.selected.length;
  const lenColor = nameLen === 0 ? "text-gray-400" : nameLen <= 15 ? "text-green-600" : nameLen <= 25 ? "text-yellow-600" : "text-red-600";
  const nameHints: Array<{ type: "warning" | "info"; text: string }> = [];
  const name = local.naming.selected;
  if (/^(Book of|Rise of|Age of|Reign of)/i.test(name)) {
    nameHints.push({ type: "warning", text: `Contains common prefix "${name.split(" ").slice(0, 2).join(" ")}" — may feel generic` });
  }
  if (name.length > 0 && name.length < 4) {
    nameHints.push({ type: "info", text: "Very short — may be hard to trademark" });
  }
  if (/[^\w\s'-]/i.test(name) && name.length > 0) {
    nameHints.push({ type: "warning", text: "Contains special characters" });
  }
  if (name.length > 25) {
    nameHints.push({ type: "warning", text: "Long name — may truncate in UI and lobby displays" });
  }

  return (
    <div className="space-y-4">
      {/* Back to Step 3 */}
      <div>
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          Back to Step 3
        </button>
      </div>

      {/* ── Section 1: Creative Brief ──────────────────────────────────── */}
      <div className="section-card space-y-4">
        <h3 className="section-title">Creative Brief</h3>

        {/* Theme / Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Theme / Setting</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="e.g., Ancient Aztec gods during cosmic storm"
            value={local.brief.theme_input}
            onChange={(e) =>
              setLocal({ ...local, brief: { ...local.brief, theme_input: e.target.value } })
            }
          />
        </div>

        {/* Creative Vision */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Creative Vision</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Describe your vision: setting, time period, atmosphere, colors, anything. Example: 'Underwater temple ruins with bioluminescent creatures, deep blues and greens, eerie but beautiful'"
            value={local.brief.creative_direction}
            onChange={(e) =>
              setLocal({ ...local, brief: { ...local.brief, creative_direction: e.target.value } })
            }
          />
          <p className="mt-1 text-xs text-gray-400">The more detail you provide, the better AI suggestions will be.</p>
        </div>

        {/* Reference Games */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Reference Games</label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="e.g., Gates of Olympus"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && refInput.trim()) {
                  setLocal({
                    ...local,
                    brief: {
                      ...local.brief,
                      references: [...local.brief.references, refInput.trim()],
                    },
                  });
                  setRefInput("");
                }
              }}
            />
            <button
              onClick={() => {
                if (refInput.trim()) {
                  setLocal({
                    ...local,
                    brief: {
                      ...local.brief,
                      references: [...local.brief.references, refInput.trim()],
                    },
                  });
                  setRefInput("");
                }
              }}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Add
            </button>
          </div>
          {local.brief.references.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {local.brief.references.map((ref, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                >
                  {ref}
                  <button
                    onClick={() =>
                      setLocal({
                        ...local,
                        brief: {
                          ...local.brief,
                          references: local.brief.references.filter((_, j) => j !== i),
                        },
                      })
                    }
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Market Saturation Check */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (!local.brief.theme_input.trim()) return;
                setSatLoading(true);
                try {
                  const res = await api.ai.saturationCheck(local.brief.theme_input);
                  setSaturation(res.saturation);
                } catch {
                  setSaturation({
                    theme_label: local.brief.theme_input,
                    game_count: 0,
                    saturation_pct: 0,
                    top_competitors: [],
                    hints: ["Check your AI connection."],
                  });
                } finally {
                  setSatLoading(false);
                }
              }}
              disabled={satLoading || !local.brief.theme_input.trim()}
              className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              {satLoading ? "Checking..." : "Check Market Saturation"}
            </button>
            <span className="text-xs text-gray-400">How crowded is this theme in iGaming?</span>
          </div>

          {saturation && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{saturation.theme_label}</span>
                <span className="text-xs text-gray-500">~{saturation.game_count} games</span>
              </div>
              {/* Saturation bar */}
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, saturation.saturation_pct)}%`,
                    backgroundColor:
                      saturation.saturation_pct > 70 ? "var(--red, #ef4444)" :
                      saturation.saturation_pct > 40 ? "var(--amber, #f59e0b)" :
                      "var(--green, #22c55e)",
                  }}
                />
              </div>
              <p className="text-xs font-medium mb-2" style={{
                color:
                  saturation.saturation_pct > 70 ? "var(--red, #ef4444)" :
                  saturation.saturation_pct > 40 ? "var(--amber, #f59e0b)" :
                  "var(--green, #22c55e)",
              }}>
                {saturation.saturation_pct}% saturated
                {saturation.saturation_pct <= 40 && " — Good opportunity"}
                {saturation.saturation_pct > 40 && saturation.saturation_pct <= 70 && " — Moderate competition"}
                {saturation.saturation_pct > 70 && " — Highly competitive"}
              </p>
              {saturation.top_competitors.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Top Competitors</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {saturation.top_competitors.map((c, i) => (
                      <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {c.name} <span className="text-gray-400">({c.provider})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {saturation.hints.length > 0 && (
                <ul className="space-y-1">
                  {saturation.hints.map((h, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-purple-400 mt-0.5">💡</span> {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: AI Concept Generation ──────────────────────────── */}
      <div className="section-card space-y-4">
        <h3 className="section-title">AI Concept Generation</h3>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateConcepts}
            disabled={!local.brief.theme_input.trim() || loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && local.concepts.length === 0 ? "Generating..." : "Generate Concepts"}
          </button>
          {aiSource && (
            <p className="text-xs text-gray-400">
              Generated via {aiSource === "ai" ? "Claude AI" : aiSource === "fallback" ? "fallback (no API key)" : "offline mode"}
            </p>
          )}
        </div>

        {/* Concept cards */}
        {local.concepts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {local.concepts.map((concept, i) => {
              const isSelected = local.selected_concept?.source === "ai_generated" && local.selected_concept.index === i;
              return (
                <button
                  key={i}
                  onClick={() =>
                    selectConcept({ source: "ai_generated", index: i, name: concept.name, usp: concept.usp })
                  }
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {concept.badge && (
                    <span className="mb-2 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {concept.badge}
                    </span>
                  )}
                  <h4 className="font-semibold text-gray-900">{concept.name}</h4>
                  <p className="mt-1 text-xs text-gray-600">{concept.usp}</p>
                  <p className="mt-2 text-xs text-gray-500">{concept.description}</p>

                  {/* AI Reasoning */}
                  {concept.reasoning && (
                    <p className="mt-2 text-xs italic text-gray-400 border-t border-gray-100 pt-2">
                      {concept.reasoning}
                    </p>
                  )}

                  {/* Market context */}
                  {concept.market_context && (
                    <p className="mt-1 text-[11px] text-purple-500">
                      📊 {concept.market_context}
                    </p>
                  )}

                  {concept.score != null && (
                    <div className="mt-3 flex items-center gap-1">
                      <span className="text-xs text-gray-500">Fit:</span>
                      <span className={`text-xs font-bold ${concept.score >= 7 ? "text-green-600" : concept.score >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                        {concept.score}/10
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom concept with AI review */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="block text-sm font-medium text-gray-700">Or write your own concept</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Concept name"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              value={local.selected_concept?.source === "custom" ? local.selected_concept.name : ""}
              onChange={(e) =>
                selectConcept({
                  source: "custom",
                  name: e.target.value,
                  usp: local.selected_concept?.source === "custom" ? local.selected_concept.usp : "",
                })
              }
            />
            <input
              type="text"
              placeholder="Unique selling point"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              value={local.selected_concept?.source === "custom" ? local.selected_concept.usp : ""}
              onChange={(e) =>
                selectConcept({
                  source: "custom",
                  name: local.selected_concept?.name ?? "",
                  usp: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Theme & Narrative ──────────────────────────────── */}
      <div className="section-card space-y-4">
        <h3 className="section-title">Theme & Narrative</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Theme Description</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            value={local.theme.description}
            onChange={(e) => setLocal({ ...local, theme: { ...local.theme, description: e.target.value } })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">USP Detail</label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            value={local.theme.usp_detail}
            onChange={(e) => setLocal({ ...local, theme: { ...local.theme, usp_detail: e.target.value } })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bonus Round Narrative</label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            placeholder="Describe what happens when bonus triggers..."
            value={local.theme.bonus_narrative}
            onChange={(e) => setLocal({ ...local, theme: { ...local.theme, bonus_narrative: e.target.value } })}
          />
        </div>

        {/* Freeform AI iteration */}
        <div className="pt-3 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Ask AI to adjust</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="e.g., 'Make it more sci-fi', 'Focus on the accumulator mechanic', 'Tone down the darkness'"
              value={iterInput}
              onChange={(e) => setIterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && iterInput.trim() && !loading) {
                  handleIterate();
                }
              }}
            />
            <button
              disabled={loading || !iterInput.trim()}
              onClick={handleIterate}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Reworking..." : "Rework"}
            </button>
          </div>
        </div>

        {/* Theme reasoning */}
        {themeReasoning.length > 0 && (
          <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-4">
            <span className="text-xs font-semibold text-purple-700">AI Reasoning — Mechanic ↔ Theme Mapping</span>
            <ul className="mt-2 space-y-1">
              {themeReasoning.map((r, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-purple-400 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Section 4: Naming ─────────────────────────────────────────── */}
      <div className="section-card space-y-4">
        <h3 className="section-title">Game Name</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Selected Name</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            value={local.naming.selected}
            onChange={(e) => setLocal({ ...local, naming: { ...local.naming, selected: e.target.value } })}
          />
          <div className="mt-1 flex items-center gap-3">
            <span className={`text-xs font-medium ${lenColor}`}>
              {nameLen} characters
              {nameLen <= 15 && nameLen > 0 && " ✓"}
            </span>
            {/* Color bar indicator */}
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (nameLen / 30) * 100)}%`,
                  backgroundColor:
                    nameLen <= 15 ? "var(--green, #22c55e)" :
                    nameLen <= 25 ? "var(--amber, #f59e0b)" :
                    "var(--red, #ef4444)",
                }}
              />
            </div>
          </div>

          {/* Validation hints */}
          {nameHints.length > 0 && (
            <div className="mt-2 space-y-1">
              {nameHints.map((h, i) => (
                <p key={i} className={`text-xs flex items-center gap-1 ${h.type === "warning" ? "text-yellow-600" : "text-gray-500"}`}>
                  {h.type === "warning" ? "⚠️" : "ℹ️"} {h.text}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* AI Name Generation */}
        <div>
          <button
            onClick={async () => {
              if (!local.brief.theme_input.trim()) return;
              setLoading(true);
              try {
                const res = await api.ai.generateNames({
                  theme: local.brief.theme_input,
                  concept_name: local.selected_concept?.name,
                  mood: local.brief.mood,
                });
                const names = res.names.map((n) => n.name);
                const reasoning: Record<string, string> = {};
                res.names.forEach((n) => { reasoning[n.name] = n.reasoning; });
                setLocal({
                  ...local,
                  naming: { ...local.naming, alternatives: names, reasoning },
                });
                setAiSource(res.source);
              } catch {
                // Fallback: keep existing
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !local.brief.theme_input.trim()}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate AI Name Suggestions"}
          </button>
        </div>

        {/* Name suggestions with reasoning */}
        {local.naming.alternatives.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suggestions</label>
            <div className="space-y-2">
              {local.naming.alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => setLocal({ ...local, naming: { ...local.naming, selected: alt } })}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    alt === local.naming.selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{alt}</span>
                  {local.naming.reasoning?.[alt] && (
                    <p className="mt-0.5 text-xs text-gray-500 italic">{local.naming.reasoning[alt]}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 5: Symbols ────────────────────────────────────────── */}
      <div className="section-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title" style={{ textTransform: "none", letterSpacing: "normal" }}>Symbol Set ({local.symbols.length})</h3>
          {local.symbols.length < 16 && (
            <button
              onClick={() => {
                const nextId = `sym${Date.now()}`;
                const newSym: SymbolDef = { id: nextId, name: "New Symbol", role: "low_pay", emoji: "🔮" };
                setLocal({ ...local, symbols: [...local.symbols, newSym] });
              }}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add Symbol
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">Click emoji to change. Min 6, max 16. Wild & Scatter cannot be removed.</p>

        {[
          { label: "Special Symbols", filter: (s: SymbolDef) => s.role === "wild" || s.role === "scatter" },
          { label: "High-Pay Symbols", filter: (s: SymbolDef) => s.role === "high_pay" },
          { label: "Low-Pay Symbols", filter: (s: SymbolDef) => s.role === "low_pay" },
        ].map((group) => {
          const groupSymbols = local.symbols.filter(group.filter);
          if (groupSymbols.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3, #6b7280)" }}>
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {groupSymbols.map((sym) => {
                  const i = local.symbols.findIndex((s) => s.id === sym.id);
                  const canRemove = sym.role !== "wild" && sym.role !== "scatter" && local.symbols.length > 6;
                  return (
                    <div key={sym.id} className="group relative flex items-center gap-2.5 rounded-lg border border-gray-200 p-3">
                      {/* Emoji placeholder — clickable */}
                      <button
                        onClick={() => setEmojiPicker(emojiPicker === sym.id ? null : sym.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                        title="Click to change emoji"
                      >
                        {sym.emoji || DEFAULT_EMOJIS[sym.id] || "❓"}
                      </button>

                      {/* Emoji picker dropdown */}
                      {emojiPicker === sym.id && (
                        <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg" style={{ width: "240px" }}>
                          <div className="grid grid-cols-6 gap-1">
                            {EMOJI_PICKER.map((em) => (
                              <button
                                key={em}
                                onClick={() => {
                                  const updated = local.symbols.map((s, j) =>
                                    j === i ? { ...s, emoji: em } : s
                                  );
                                  setLocal({ ...local, symbols: updated });
                                  setEmojiPicker(null);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 text-base"
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <input
                        type="text"
                        className="flex-1 min-w-0 rounded border border-transparent px-1 py-0.5 text-sm text-gray-800 hover:border-gray-200 focus:border-blue-400 focus:outline-none"
                        value={sym.name}
                        onChange={(e) => {
                          const updated = local.symbols.map((s, j) =>
                            j === i ? { ...s, name: e.target.value } : s
                          );
                          setLocal({ ...local, symbols: updated });
                        }}
                      />

                      {/* Role selector */}
                      <select
                        value={sym.role}
                        onChange={(e) => {
                          const updated = local.symbols.map((s, j) =>
                            j === i ? { ...s, role: e.target.value as SymbolDef["role"] } : s
                          );
                          setLocal({ ...local, symbols: updated });
                        }}
                        className="shrink-0 rounded border border-gray-200 bg-transparent px-1.5 py-0.5 text-[11px] text-gray-500"
                        disabled={sym.role === "wild" || sym.role === "scatter"}
                      >
                        <option value="wild">Wild</option>
                        <option value="scatter">Scatter</option>
                        <option value="high_pay">High Pay</option>
                        <option value="low_pay">Low Pay</option>
                      </select>

                      {/* Remove button */}
                      {canRemove && (
                        <button
                          onClick={() => {
                            setLocal({ ...local, symbols: local.symbols.filter((_, j) => j !== i) });
                          }}
                          className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow transition-opacity hover:bg-red-600"
                          title="Remove symbol"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Symbol descriptions table */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3, #6b7280)" }}>
            Symbol Descriptions
          </p>
          <div className="space-y-2">
            {local.symbols.map((sym) => {
              const i = local.symbols.findIndex((s) => s.id === sym.id);
              const roleLabel = sym.role === "wild" ? "Wild" : sym.role === "scatter" ? "Scatter" : sym.role === "high_pay" ? "High Pay" : "Low Pay";
              return (
                <div key={sym.id} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 text-sm mt-0.5">
                    {sym.emoji || DEFAULT_EMOJIS[sym.id] || "❓"}
                  </span>
                  <div className="shrink-0 w-[120px] mt-1">
                    <span className="text-sm font-medium text-gray-800">{sym.name}</span>
                    <span className="ml-1.5 text-[10px] text-gray-400">{roleLabel}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Add description..."
                    className="flex-1 min-w-0 rounded border border-transparent px-2 py-1 text-sm text-gray-700 placeholder-gray-300 hover:border-gray-200 focus:border-blue-400 focus:outline-none"
                    value={sym.description || ""}
                    onChange={(e) => {
                      const updated = local.symbols.map((s, j) =>
                        j === i ? { ...s, description: e.target.value } : s
                      );
                      setLocal({ ...local, symbols: updated });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Holistic Review */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.ai.symbolReview({
                  theme: local.brief.theme_input || local.theme.description,
                  symbols: local.symbols,
                  volatility: gameContext?.volatility,
                  holistic: true,
                });
                setHolisticReview(res.review as HolisticSymbolReview);
              } catch {
                // ignore
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {loading ? "Reviewing..." : "Review Full Set"}
          </button>

          {holisticReview && (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
              {/* Overall score badge */}
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${
                  holisticReview.overall_score >= 8 ? "bg-green-500" :
                  holisticReview.overall_score >= 6 ? "bg-yellow-500" : "bg-red-500"
                }`}>
                  {holisticReview.overall_score}
                </span>
                <span className="text-sm font-semibold text-gray-900">Overall Set Quality</span>
              </div>

              {/* Theme Fit */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">Theme Fit</span>
                  <span className="text-xs text-gray-500">{holisticReview.theme_fit.score}/10</span>
                </div>
                <p className="text-xs text-gray-600">{holisticReview.theme_fit.feedback}</p>
              </div>

              {/* Distinctiveness */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">Visual Distinctiveness</span>
                  <span className="text-xs text-gray-500">{holisticReview.distinctiveness.score}/10</span>
                </div>
                <p className="text-xs text-gray-600">{holisticReview.distinctiveness.feedback}</p>
              </div>

              {/* Missing Archetypes */}
              {holisticReview.missing_archetypes.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-700">Missing Archetypes</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {holisticReview.missing_archetypes.map((a, i) => (
                      <span key={i} className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {holisticReview.suggestions.length > 0 && (
                <ul className="space-y-1">
                  {holisticReview.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">💡</span> {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 6: Art & Sound Direction ──────────────────────────── */}
      <div className="section-card space-y-4">
        <h3 className="section-title">Art Direction</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Art Style Description</label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            placeholder="Describe the visual style..."
            value={local.art_direction.style}
            onChange={(e) =>
              setLocal({ ...local, art_direction: { ...local.art_direction, style: e.target.value } })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Color Palette</label>
          <div className="mt-2 flex gap-2">
            {local.art_direction.palette.map((color, i) => (
              <div key={i} className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const palette = [...local.art_direction.palette];
                    palette[i] = e.target.value;
                    setLocal({ ...local, art_direction: { ...local.art_direction, palette } });
                  }}
                  className="h-10 w-10 cursor-pointer rounded border border-gray-200"
                />
              </div>
            ))}
          </div>

          {/* Palette Preview Bar */}
          <div className="mt-3">
            <div className="h-8 rounded-lg overflow-hidden flex">
              {local.art_direction.palette.map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
            {/* Mini preview card */}
            <div
              className="mt-2 rounded-lg p-3 text-center"
              style={{ backgroundColor: local.art_direction.palette[0], color: local.art_direction.palette[4] || "#fff" }}
            >
              <span className="text-sm font-bold" style={{ color: local.art_direction.palette[2] || "#d4a017" }}>
                {local.naming.selected || "Game Title"}
              </span>
              <p className="text-xs mt-1 opacity-80">Palette preview</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Sound Direction</h3>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.ai.generateSoundDirection({
                  theme: local.brief.theme_input || local.theme.description,
                  art_style: local.art_direction.style,
                  palette: local.art_direction.palette,
                });
                setLocal({
                  ...local,
                  art_direction: {
                    ...local.art_direction,
                    sound: res.sounds,
                  },
                });
              } catch {
                // Keep existing
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate from Theme"}
          </button>
        </div>

        {(["ambient", "spin", "win", "bonus_trigger", "cascade", "max_win"] as const).map((key) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 capitalize">
              {key.replace("_", " ")}
            </label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
              placeholder={`Describe ${key.replace("_", " ")} sound...`}
              value={local.art_direction.sound[key]}
              onChange={(e) =>
                setLocal({
                  ...local,
                  art_direction: {
                    ...local.art_direction,
                    sound: { ...local.art_direction.sound, [key]: e.target.value },
                  },
                })
              }
            />
          </div>
        ))}

        {/* Custom sound fields */}
        {Object.entries(local.art_direction.sound)
          .filter(([key]) => !["ambient", "spin", "win", "bonus_trigger", "cascade", "max_win"].includes(key))
          .map(([key]) => (
            <div key={key} className="relative">
              <label className="block text-xs font-medium text-gray-600">{key}</label>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
                placeholder={`Describe ${key} sound...`}
                value={(local.art_direction.sound as Record<string, string>)[key] ?? ""}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    art_direction: {
                      ...local.art_direction,
                      sound: { ...local.art_direction.sound, [key]: e.target.value },
                    },
                  })
                }
              />
              <button
                onClick={() => {
                  const soundCopy = { ...local.art_direction.sound } as Record<string, string>;
                  delete soundCopy[key];
                  setLocal({ ...local, art_direction: { ...local.art_direction, sound: soundCopy as typeof local.art_direction.sound } });
                }}
                className="absolute top-0 right-0 text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}

        {/* Add custom field */}
        <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500">Add custom sound field</label>
            <input
              type="text"
              id="custom-sound-name"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Field name, e.g. Free Spins Intro"
            />
          </div>
          <button
            onClick={() => {
              const input = document.getElementById("custom-sound-name") as HTMLInputElement;
              const name = input?.value.trim();
              if (!name) return;
              setLocal({
                ...local,
                art_direction: {
                  ...local.art_direction,
                  sound: { ...local.art_direction.sound, [name]: "" },
                },
              });
              if (input) input.value = "";
            }}
            className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
          >
            + Add
          </button>
        </div>
      </div>

      {/* ── Bottom navigation ─────────────────────────────────────────── */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          className="btn btn-solid btn-lg"
        >
          Save & Continue to Math Model
        </button>
      </div>
    </div>
  );
}
