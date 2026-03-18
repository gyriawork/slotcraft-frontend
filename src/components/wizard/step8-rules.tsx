"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step8Data,
  ResolvedVariable,
  TranslationEntry,
  TranslationStatus,
} from "@/lib/wizard-types";

/* ─── Constants ─── */

const DEFAULT_LANGUAGES = [
  "bg", "cs", "de", "en", "ens", "es", "fr", "hr",
  "hu", "it", "ja", "ko", "lt", "pl", "pt", "ptpt",
  "ro", "ru", "th", "tr", "uk", "zh",
];

const LANGUAGE_NAMES: Record<string, string> = {
  bg: "Bulgarian", cs: "Czech", de: "German", en: "English",
  ens: "English Social", es: "Spanish", fr: "French", hr: "Croatian",
  hu: "Hungarian", it: "Italian", ja: "Japanese", ko: "Korean",
  lt: "Lithuanian", pl: "Polish", pt: "Portuguese (BR)",
  ptpt: "Portuguese (PT)", ro: "Romanian", ru: "Russian",
  th: "Thai", tr: "Turkish", uk: "Ukrainian", zh: "Chinese",
};

const STATUS_COLORS: Record<TranslationStatus, { dot: string; label: string }> = {
  source: { dot: "var(--accent)", label: "Source" },
  translated: { dot: "var(--green)", label: "Translated" },
  draft: { dot: "var(--amber)", label: "Draft" },
  empty: { dot: "var(--text3)", label: "Empty" },
};

/* ─── Variable resolution ─── */

function resolveAutoVariables(
  step1: Step1Data | null,
  step2: Step2Data | null,
  step4: Step4Data | null,
  step6: Step6Data | null,
): Record<string, ResolvedVariable> {
  const vars: Record<string, ResolvedVariable> = {};

  // Game name
  const gameName = step4?.naming?.selected || "";
  vars["%Gamename"] = { value: gameName, source: "auto", step_ref: "step4.naming.selected" };

  // Grid
  vars["${reels}"] = { value: String(step1?.grid?.reels ?? ""), source: "auto", step_ref: "step1.grid.reels" };
  vars["${rows}"] = { value: String(step1?.grid?.rows ?? ""), source: "auto", step_ref: "step1.grid.rows" };
  vars["${paylines}"] = { value: String(step1?.paylines ?? ""), source: "auto", step_ref: "step1.paylines" };

  // Bet
  vars["${minBet}"] = { value: step1?.bet?.min != null ? step1.bet.min.toFixed(2) : "", source: "auto", step_ref: "step1.bet.min" };
  vars["${maxBet}"] = { value: step1?.bet?.max != null ? step1.bet.max.toFixed(2) : "", source: "auto", step_ref: "step1.bet.max" };
  vars["${currency}"] = { value: "EUR", source: "auto", step_ref: "step1.bet.currency" };

  // RTP & volatility
  const rtp = step6?.rtp ?? step2?.target_rtp;
  vars["${rtp}"] = { value: rtp != null ? rtp.toFixed(2) : "", source: "auto", step_ref: "step6.rtp || step2.target_rtp" };
  vars["${volatility}"] = { value: step2?.volatility ?? "", source: "auto", step_ref: "step2.volatility" };

  // Max win
  const maxWin = step6?.max_win ?? step2?.max_win;
  vars["${maxWin}"] = { value: maxWin != null ? String(maxWin) : "", source: "auto", step_ref: "step6.max_win || step2.max_win" };

  return vars;
}

function mergeVariables(
  auto: Record<string, ResolvedVariable>,
  existing: Record<string, ResolvedVariable> | undefined,
): Record<string, ResolvedVariable> {
  const merged = { ...auto };
  // Preserve manual variables from existing data
  if (existing) {
    for (const [key, val] of Object.entries(existing)) {
      if (val.source === "manual") {
        merged[key] = val;
      }
    }
  }
  return merged;
}

/* ─── Default step data ─── */

function defaultStep8Data(): Step8Data {
  const translations: Record<string, TranslationEntry> = {};
  for (const lang of DEFAULT_LANGUAGES) {
    translations[lang] = lang === "en"
      ? { status: "source", content: "", updated_at: new Date().toISOString() }
      : { status: "empty", content: null, updated_at: null };
  }

  return {
    template: {
      source_lang: "en",
      content: "",
      uploaded_file_url: null,
      auto_generated: false,
    },
    variables: {},
    translations,
    languages: [...DEFAULT_LANGUAGES],
    custom_languages: [],
  };
}

/* ─── Props ─── */

interface Props {
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4: Step4Data | null;
  step5: Step5Data | null;
  step6: Step6Data | null;
  data?: Step8Data;
  onUpdate: (data: Step8Data) => void;
  onBack: () => void;
}

/* ─── Main Component ─── */

export function Step8Rules({
  step1, step2, step3, step4, step5, step6,
  data, onUpdate, onBack,
}: Props) {
  const [tab, setTab] = useState<"languages" | "variables" | "template">("languages");

  // Initialize from data or defaults. Guard against legacy data shapes
  // (e.g., old Export-shaped step8 data from before renumbering)
  const initial = (data && data.template && data.translations) ? data : defaultStep8Data();

  const [template, setTemplate] = useState(initial.template);
  const [translations, setTranslations] = useState(initial.translations);
  const [languages, setLanguages] = useState(initial.languages);
  const [customLanguages, setCustomLanguages] = useState(initial.custom_languages);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [translationDraft, setTranslationDraft] = useState("");
  const [showAddLang, setShowAddLang] = useState(false);
  const [newLangCode, setNewLangCode] = useState("");
  const [newLangName, setNewLangName] = useState("");
  const [newVarName, setNewVarName] = useState("");
  const [newVarValue, setNewVarValue] = useState("");
  const [showAddVar, setShowAddVar] = useState(false);

  // Resolve auto variables from project data
  const autoVars = useMemo(
    () => resolveAutoVariables(step1, step2, step4, step6),
    [step1, step2, step4, step6],
  );

  const variables = useMemo(
    () => mergeVariables(autoVars, initial.variables),
    [autoVars, initial.variables],
  );

  const [manualVars, setManualVars] = useState<Record<string, ResolvedVariable>>(() => {
    const mvars: Record<string, ResolvedVariable> = {};
    for (const [k, v] of Object.entries(initial.variables)) {
      if (v.source === "manual") mvars[k] = v;
    }
    return mvars;
  });

  const allVariables = useMemo(() => {
    return { ...autoVars, ...manualVars };
  }, [autoVars, manualVars]);

  // Stats
  const allLangs = [...languages, ...customLanguages];
  const translatedCount = allLangs.filter((l) => translations[l]?.status === "translated").length;
  const emptyCount = allLangs.filter((l) => translations[l]?.status === "empty").length;
  const variableCount = Object.keys(allVariables).length;

  // Save helper
  const save = useCallback(() => {
    onUpdate({
      template,
      variables: allVariables,
      translations,
      languages,
      custom_languages: customLanguages,
    });
  }, [template, allVariables, translations, languages, customLanguages, onUpdate]);

  // Select language for editing
  const selectLanguage = useCallback((lang: string) => {
    setSelectedLang(lang);
    setTranslationDraft(translations[lang]?.content ?? "");
  }, [translations]);

  // Save translation
  const saveTranslation = useCallback(() => {
    if (!selectedLang) return;
    const isSource = selectedLang === template.source_lang;
    setTranslations((prev) => ({
      ...prev,
      [selectedLang]: {
        status: isSource ? "source" : (translationDraft ? "translated" : "empty"),
        content: translationDraft || null,
        updated_at: new Date().toISOString(),
      },
    }));
    // Also update template content if this is the source language
    if (isSource) {
      setTemplate((prev) => ({ ...prev, content: translationDraft }));
    }
  }, [selectedLang, translationDraft, template.source_lang]);

  // Add language
  const addLanguage = useCallback(() => {
    const code = newLangCode.trim().toLowerCase();
    if (!code || allLangs.includes(code)) return;
    setCustomLanguages((prev) => [...prev, code]);
    if (newLangName.trim()) {
      LANGUAGE_NAMES[code] = newLangName.trim();
    }
    setTranslations((prev) => ({
      ...prev,
      [code]: { status: "empty", content: null, updated_at: null },
    }));
    setNewLangCode("");
    setNewLangName("");
    setShowAddLang(false);
  }, [newLangCode, newLangName, allLangs]);

  // Add manual variable
  const addManualVariable = useCallback(() => {
    const name = newVarName.trim();
    if (!name) return;
    const varKey = name.startsWith("${") ? name : `\${${name}}`;
    setManualVars((prev) => ({
      ...prev,
      [varKey]: { value: newVarValue, source: "manual", step_ref: null },
    }));
    setNewVarName("");
    setNewVarValue("");
    setShowAddVar(false);
  }, [newVarName, newVarValue]);

  // Detect variables in text
  const detectVariables = useCallback((text: string) => {
    const found = new Set<string>();
    const patterns = text.match(/\$\{[^}]+\}|%\w+/g) || [];
    for (const p of patterns) found.add(p);
    return found;
  }, []);

  // Preview resolved text
  const resolveText = useCallback((text: string) => {
    let resolved = text;
    for (const [key, val] of Object.entries(allVariables)) {
      resolved = resolved.replaceAll(key, val.value || `[${key}]`);
    }
    return resolved;
  }, [allVariables]);

  // Highlight variables in template text
  const renderHighlightedText = useCallback((text: string) => {
    if (!text) return <span style={{ color: "var(--text3)" }}>No content yet</span>;
    const parts: Array<{ type: "text" | "var"; content: string; value?: string }> = [];
    let lastIndex = 0;
    const regex = /\$\{[^}]+\}|%\w+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      const varName = match[0];
      const resolved = allVariables[varName]?.value;
      parts.push({ type: "var", content: varName, value: resolved });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return (
      <>
        {parts.map((p, i) =>
          p.type === "var" ? (
            <span key={i}>
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[11px] font-mono font-medium mx-0.5"
                style={{ background: "rgba(20,184,166,.12)", color: "var(--teal, #14b8a6)" }}
              >
                {p.content}
              </span>
              {p.value && (
                <span className="text-[10px] font-mono mx-0.5" style={{ color: "var(--green, #22c55e)" }}>
                  {p.value}
                </span>
              )}
            </span>
          ) : (
            <span key={i}>{p.content}</span>
          ),
        )}
      </>
    );
  }, [allVariables]);

  const TABS = [
    { key: "languages" as const, label: "Languages & Editor" },
    { key: "variables" as const, label: "Dynamic Variables" },
    { key: "template" as const, label: "Template" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px]" style={{ color: "var(--text2)" }}>
          Manage game rules, dynamic variables, and AI translations for {allLangs.length} languages
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-md px-4 py-[7px] text-[12px] font-medium cursor-pointer"
            style={{ border: "0.5px solid var(--border)", color: "var(--text2)" }}
          >
            Back
          </button>
          <button
            onClick={save}
            className="rounded-md px-4 py-[7px] text-[12px] font-medium cursor-pointer"
            style={{ background: "var(--accent-soft)", border: "0.5px solid var(--accent-border)", color: "var(--accent)" }}
          >
            Save & Continue
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard value={String(allLangs.length)} label="Total Languages" />
        <StatCard value={String(translatedCount)} label="Translated" color="var(--green)" />
        <StatCard value={String(emptyCount)} label="Missing" color="var(--amber)" />
        <StatCard value={String(variableCount)} label="Variables" color="var(--teal, #14b8a6)" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-[13px] font-medium cursor-pointer transition-all duration-100"
            style={{
              borderBottom: `2px solid ${tab === t.key ? "var(--accent)" : "transparent"}`,
              color: tab === t.key ? "var(--accent)" : "var(--text2)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Languages & Editor */}
      {tab === "languages" && (
        <div className="space-y-4">
          {/* Bulk actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="rounded-md px-3.5 py-[7px] text-[12px] font-medium cursor-pointer"
              style={{ background: "var(--accent-soft)", border: "0.5px solid var(--accent-border)", color: "var(--accent)" }}
              onClick={() => {
                // Simulate AI translation (placeholder — in production calls Claude API)
                const sourceTxt = template.content || translations[template.source_lang]?.content || "";
                if (!sourceTxt) return;
                const newTranslations = { ...translations };
                for (const lang of allLangs) {
                  if (newTranslations[lang]?.status === "empty") {
                    newTranslations[lang] = {
                      status: "translated",
                      content: `[AI ${LANGUAGE_NAMES[lang] ?? lang}] ${sourceTxt}`,
                      updated_at: new Date().toISOString(),
                    };
                  }
                }
                setTranslations(newTranslations);
              }}
            >
              AI Translate Missing ({emptyCount})
            </button>
            <button
              className="rounded-md px-3.5 py-[7px] text-[12px] font-medium cursor-pointer"
              style={{ border: "0.5px solid var(--border)", color: "var(--text2)" }}
              onClick={() => {
                // Validate all translations
                let valid = 0;
                let invalid = 0;
                const varNames = Object.keys(allVariables);
                for (const lang of allLangs) {
                  const t = translations[lang];
                  if (!t?.content) continue;
                  const missing = varNames.filter((v) => !t.content!.includes(v));
                  if (missing.length === 0) valid++;
                  else invalid++;
                }
                alert(`Validation complete: ${valid} valid, ${invalid} with missing variables`);
              }}
            >
              Validate All
            </button>
            <div className="relative">
              <button
                className="rounded-md px-3.5 py-[7px] text-[12px] font-medium cursor-pointer"
                style={{ border: "0.5px solid var(--border)", color: "var(--text2)" }}
                onClick={() => {
                  // Export as JSON (simplified)
                  const output: Record<string, string | null> = {};
                  for (const lang of allLangs) {
                    const t = translations[lang];
                    if (t?.content) output[lang] = t.content;
                  }
                  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "translations.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export
              </button>
            </div>
          </div>

          {/* Language grid + Editor side by side */}
          <div className="grid gap-4" style={{ gridTemplateColumns: selectedLang ? "1fr 1fr" : "1fr" }}>
            {/* Language cards */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {allLangs.map((lang) => {
                  const t = translations[lang];
                  const status = t?.status ?? "empty";
                  const isSelected = selectedLang === lang;
                  return (
                    <button
                      key={lang}
                      onClick={() => selectLanguage(lang)}
                      className="rounded-lg border p-3 text-left cursor-pointer transition-all duration-100"
                      style={{
                        background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                        borderColor: isSelected ? "var(--accent-border)" : "var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>
                          {lang.toUpperCase()}
                        </span>
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: STATUS_COLORS[status].dot }}
                        />
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text2)" }}>
                        {LANGUAGE_NAMES[lang] ?? lang}
                      </p>
                      {lang === template.source_lang && (
                        <span
                          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          Source
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Add language card */}
                <button
                  onClick={() => setShowAddLang(true)}
                  className="rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-all duration-100"
                  style={{ borderColor: "var(--border)", color: "var(--text3)" }}
                >
                  <span className="text-lg">+</span>
                  <p className="text-[11px] mt-0.5">Add Language</p>
                </button>
              </div>
            </div>

            {/* Editor panel */}
            {selectedLang && (
              <div className="rounded-lg border p-4 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    {LANGUAGE_NAMES[selectedLang] ?? selectedLang} ({selectedLang.toUpperCase()})
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      className="rounded px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      onClick={() => {
                        // AI translate placeholder
                        const src = template.content || translations[template.source_lang]?.content || "";
                        if (src) {
                          setTranslationDraft(`[AI ${LANGUAGE_NAMES[selectedLang] ?? selectedLang}] ${src}`);
                        }
                      }}
                    >
                      AI Translate
                    </button>
                    <button
                      className="rounded px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                      style={{ border: "0.5px solid var(--border)", color: "var(--text2)" }}
                      onClick={saveTranslation}
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Source (read-only) */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
                    Source ({template.source_lang.toUpperCase()})
                  </label>
                  <div
                    className="mt-1 rounded-md border p-3 text-[12px] leading-relaxed max-h-[200px] overflow-y-auto"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {renderHighlightedText(template.content || translations[template.source_lang]?.content || "")}
                  </div>
                </div>

                {/* Target (editable) */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
                    Translation
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-md border p-3 text-[12px] font-mono leading-relaxed focus:outline-none focus:ring-1"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                      minHeight: 200,
                      outline: "none",
                    }}
                    value={translationDraft}
                    onChange={(e) => setTranslationDraft(e.target.value)}
                    placeholder={selectedLang === template.source_lang
                      ? "Edit the source template text..."
                      : "Click 'AI Translate' to generate, or type your translation..."
                    }
                  />
                </div>

                {/* Variable check */}
                {translationDraft && (() => {
                  const detected = detectVariables(translationDraft);
                  const allVarNames = Object.keys(allVariables);
                  const present = allVarNames.filter((v) => detected.has(v));
                  const missing = allVarNames.filter((v) => !detected.has(v));
                  return (
                    <div className="text-[11px]" style={{ color: missing.length > 0 ? "var(--amber)" : "var(--green)" }}>
                      Variables detected: {present.length}/{allVarNames.length}
                      {missing.length > 0
                        ? ` — Missing: ${missing.join(", ")}`
                        : " — All present"
                      }
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Add language dialog */}
          {showAddLang && (
            <div className="rounded-lg border p-4 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <h4 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Add Language</h4>
              <div className="flex gap-2">
                <input
                  className="rounded-md border px-3 py-1.5 text-[12px] w-24"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="Code (e.g. sv)"
                  value={newLangCode}
                  onChange={(e) => setNewLangCode(e.target.value)}
                />
                <input
                  className="rounded-md border px-3 py-1.5 text-[12px] flex-1"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="Language name (e.g. Swedish)"
                  value={newLangName}
                  onChange={(e) => setNewLangName(e.target.value)}
                />
                <button
                  onClick={addLanguage}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddLang(false)}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer"
                  style={{ color: "var(--text3)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Dynamic Variables */}
      {tab === "variables" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px]" style={{ color: "var(--text2)" }}>
              Auto variables update from project data. Manual variables are editable.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddVar(true)}
                className="rounded-md px-3.5 py-[7px] text-[12px] font-medium cursor-pointer"
                style={{ background: "var(--accent-soft)", border: "0.5px solid var(--accent-border)", color: "var(--accent)" }}
              >
                + Add Custom Variable
              </button>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ background: "var(--bg3)", color: "var(--text3)", borderBottom: "1px solid var(--border)" }}
            >
              <span>Variable</span>
              <span>Resolved Value</span>
              <span>Source</span>
            </div>

            {/* Rows */}
            {Object.entries(allVariables).map(([varName, varData]) => (
              <div
                key={varName}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center px-4 py-2.5 border-b"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span
                  className="text-[12px] font-mono font-medium"
                  style={{ color: "var(--teal, #14b8a6)" }}
                >
                  {varName}
                </span>
                <div>
                  {varData.source === "auto" ? (
                    <span
                      className="text-[12px] font-mono"
                      style={{ color: "var(--green)" }}
                    >
                      {varData.value || "—"}
                    </span>
                  ) : (
                    <input
                      className="rounded border px-2 py-1 text-[12px] font-mono w-full"
                      style={{
                        background: "var(--bg)",
                        borderColor: "var(--border)",
                        color: "var(--amber)",
                      }}
                      value={varData.value}
                      onChange={(e) => {
                        setManualVars((prev) => ({
                          ...prev,
                          [varName]: { ...prev[varName], value: e.target.value },
                        }));
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: varData.source === "auto" ? "rgba(34,197,94,.1)" : "rgba(245,158,11,.1)",
                      color: varData.source === "auto" ? "var(--green)" : "var(--amber)",
                    }}
                  >
                    {varData.source}
                  </span>
                  {varData.step_ref && (
                    <span className="text-[10px]" style={{ color: "var(--text3)" }}>
                      {varData.step_ref}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add variable form */}
          {showAddVar && (
            <div className="rounded-lg border p-4 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <h4 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Add Custom Variable</h4>
              <div className="flex gap-2">
                <input
                  className="rounded-md border px-3 py-1.5 text-[12px] font-mono w-48"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="Variable name"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                />
                <input
                  className="rounded-md border px-3 py-1.5 text-[12px] flex-1"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="Default value"
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                />
                <button
                  onClick={addManualVariable}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddVar(false)}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer"
                  style={{ color: "var(--text3)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Template */}
      {tab === "template" && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="rounded-md px-3.5 py-[7px] text-[12px] font-medium cursor-pointer"
              style={{ background: "var(--accent-soft)", border: "0.5px solid var(--accent-border)", color: "var(--accent)" }}
              onClick={() => {
                // Generate template from project data (placeholder)
                const gameName = step4?.naming?.selected || "Untitled Game";
                const features = step3?.features?.map((f) => f.type).join(", ") || "none";
                const generated = `GAME DESCRIPTION\n\n%Gamename is a \${reels}x\${rows} video slot with \${paylines} paylines.\n\nFEATURES\n\nThe game includes the following features: ${features}.\n\nGAMEPLAY\n\nMinimum bet: \${minBet} \${currency}\nMaximum bet: \${maxBet} \${currency}\n\nRETURN TO PLAYER\n\nThe theoretical return to player (RTP) is \${rtp}%.\nVolatility: \${volatility}\nMaximum win: \${maxWin}x total bet.\n\nRANDOMIZATION\n\nAll game outcomes are determined by a certified Random Number Generator (RNG). The results of each round are independent and not influenced by previous results.`;
                setTemplate((prev) => ({ ...prev, content: generated, auto_generated: true }));
                // Also set as source translation
                setTranslations((prev) => ({
                  ...prev,
                  [template.source_lang]: {
                    status: "source",
                    content: generated,
                    updated_at: new Date().toISOString(),
                  },
                }));
              }}
            >
              Generate from Project
            </button>
            <button
              className="rounded-md px-3.5 py-[7px] text-[12px] font-medium cursor-pointer"
              style={{ border: "0.5px solid var(--border)", color: "var(--text2)" }}
              onClick={() => {
                // Download template as .txt
                const blob = new Blob([template.content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rules_template.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Template
            </button>
          </div>

          {/* Template editor */}
          <div className="rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <textarea
              className="w-full rounded-t-lg border-0 p-4 text-[12px] font-mono leading-relaxed focus:outline-none"
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                minHeight: 400,
                resize: "vertical",
              }}
              value={template.content}
              onChange={(e) => setTemplate((prev) => ({ ...prev, content: e.target.value, auto_generated: false }))}
              placeholder="Enter your rules template here. Use ${variable} syntax for dynamic values..."
            />
            <div
              className="flex items-center justify-between rounded-b-lg border-t px-4 py-2.5"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                {detectVariables(template.content).size} variables detected
                {template.auto_generated ? " — Auto-generated" : ""}
              </span>
              <button
                className="rounded px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                style={{ border: "0.5px solid var(--border)", color: "var(--text2)" }}
                onClick={() => {
                  alert(resolveText(template.content));
                }}
              >
                Preview Resolved
              </button>
            </div>
          </div>

          {/* Resolved preview */}
          <div className="rounded-lg border p-4" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
              Template Preview (with variables)
            </label>
            <div className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {renderHighlightedText(template.content)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function StatCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="text-xl font-semibold" style={{ color: color || "var(--text)" }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>{label}</div>
    </div>
  );
}
