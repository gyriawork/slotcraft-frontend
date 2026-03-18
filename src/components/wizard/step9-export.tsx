"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
  Step9Data,
  GddAudience,
  GddFormat,
} from "@/lib/wizard-types";
import {
  AUDIENCE_LABELS,
  AUDIENCE_SECTIONS,
  FORMAT_LABELS,
  INTEGRATION_FORMATS,
  buildSections,
  downloadFile,
  exportFileName,
  safeFileName,
  sectionsToMarkdown,
  sectionsToJson,
} from "@/lib/gdd-export";
import { generateGddPdf } from "@/lib/gdd-pdf";

interface Props {
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4: Step4Data | null;
  step5: Step5Data | null;
  step6: Step6Data | null;
  step7: Step7Data | null;
  data?: Step9Data;
  onUpdate: (data: Step9Data) => void;
  onBack: () => void;
}

export function Step9Export({
  step1, step2, step3, step4, step5, step6, step7,
  data, onUpdate, onBack,
}: Props) {
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [selectedAudience, setSelectedAudience] = useState<GddAudience>(data?.selected_audience ?? "full");
  const [exportingFormat, setExportingFormat] = useState<GddFormat | null>(null);
  const [customNotes, setCustomNotes] = useState<Record<string, string>>(data?.custom_notes ?? {});
  const [exports, setExports] = useState(data?.exports ?? []);

  const sections = useMemo(
    () => buildSections(step1, step2, step3, step4, step5, step6, step7),
    [step1, step2, step3, step4, step5, step6, step7],
  );

  const readyCount = sections.filter(s => s.ready).length;
  const completionPct = Math.round((readyCount / sections.length) * 100);

  const visibleSections = useMemo(
    () => {
      const indices = AUDIENCE_SECTIONS[selectedAudience];
      return sections.filter((_, i) => indices.includes(i + 1));
    },
    [sections, selectedAudience],
  );

  const gameName = step4?.naming?.selected || step1?.variant || "Untitled";
  const safeName = safeFileName(gameName);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleExport = useCallback(async (format: GddFormat) => {
    if (INTEGRATION_FORMATS.has(format)) {
      setToastMsg(`${FORMAT_LABELS[format].label} integration coming soon`);
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    setExportingFormat(format);

    const filtered = visibleSections;

    try {
      if (format === "markdown") {
        const md = sectionsToMarkdown(gameName, selectedAudience, filtered, customNotes);
        downloadFile(md, exportFileName(gameName, selectedAudience, "md"), "text/markdown");
      } else if (format === "json") {
        const json = sectionsToJson(gameName, selectedAudience, filtered, customNotes, step5, step6);
        downloadFile(json, exportFileName(gameName, selectedAudience, "json"), "application/json");
      } else if (format === "pdf") {
        const blob = await generateGddPdf(gameName, selectedAudience, filtered, customNotes);
        downloadFile(blob, exportFileName(gameName, selectedAudience, "pdf"));
        setToastMsg("PDF exported successfully");
        setTimeout(() => setToastMsg(null), 3000);
      }
    } catch (err) {
      console.error("Export failed:", err);
      setToastMsg("Export failed — please try again");
      setTimeout(() => setToastMsg(null), 3000);
    }

    const entry = {
      format,
      audience: selectedAudience,
      timestamp: new Date().toISOString(),
    };
    const newExports = [...exports, entry];
    setExports(newExports);
    setExportingFormat(null);

    // Analytics
    import("@/lib/monitoring").then(({ trackEvent, Events }) =>
      trackEvent(Events.GDD_EXPORTED, { format, audience: selectedAudience })
    );

    onUpdate({
      sections,
      selected_audience: selectedAudience,
      custom_notes: customNotes,
      exports: newExports,
    });
  }, [selectedAudience, exports, sections, visibleSections, customNotes, onUpdate, gameName, step5, step6]);

  const handleNoteChange = useCallback((sectionId: string, note: string) => {
    setCustomNotes(prev => ({ ...prev, [sectionId]: note }));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Step 9 — GDD Export</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate your Game Design Document in 5 audience variants and 6 formats
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {/* Sub-step tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          [1, "Contents"],
          [2, "Preview & Edit"],
          [3, "Export"],
        ] as const).map(([n, label]) => (
          <button
            key={n}
            onClick={() => setSubStep(n)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              subStep === n
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {n}. {label}
          </button>
        ))}
      </div>

      {/* Sub-step 1: Contents / Completeness */}
      {subStep === 1 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900">Document Completeness</span>
              <span className={`font-bold ${completionPct === 100 ? "text-green-600" : "text-amber-600"}`}>
                {completionPct}% ({readyCount}/{sections.length} sections ready)
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${completionPct === 100 ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            {(() => {
              const stepDataMap: Record<number, unknown> = {
                1: step1, 2: step2, 3: step3, 4: step4,
                5: step5, 6: step6, 7: step7,
              };

              type SectionStatus = "ready" | "partial" | "empty";
              const getSectionStatus = (section: typeof sections[number]): SectionStatus => {
                if (section.ready) return "ready";
                if (stepDataMap[section.source_step]) return "partial";
                return "empty";
              };

              const statusDot = (status: SectionStatus) => {
                const colors: Record<SectionStatus, string> = {
                  ready: "bg-green-500",
                  partial: "bg-amber-400",
                  empty: "bg-gray-300",
                };
                return (
                  <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colors[status]}`} />
                );
              };

              const statusLabel = (status: SectionStatus) => {
                const map: Record<SectionStatus, { text: string; classes: string }> = {
                  ready: { text: "Ready", classes: "text-green-700 bg-green-100" },
                  partial: { text: "Needs review", classes: "text-amber-700 bg-amber-100" },
                  empty: { text: "Not started", classes: "text-gray-500 bg-gray-100" },
                };
                const { text, classes } = map[status];
                return (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
                    {text}
                  </span>
                );
              };

              const groups = [
                { label: "Game Overview", indices: [0, 1, 2] },
                { label: "Game Rules", indices: [3, 4, 5] },
                { label: "Mathematics", indices: [6, 7, 8] },
                { label: "Production", indices: [9, 10, 11] },
              ];

              return groups.map((group) => (
                <div key={group.label}>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-widest mt-4 mb-2"
                    style={{ color: "var(--text3, #9ca3af)" }}
                  >
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.indices.map((idx) => {
                      const section = sections[idx];
                      if (!section) return null;
                      const status = getSectionStatus(section);
                      return (
                        <div
                          key={section.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-center gap-3">
                            {statusDot(status)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{section.title}</p>
                              <p className="text-xs text-gray-500">Source: Step {section.source_step}</p>
                            </div>
                          </div>
                          {statusLabel(status)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setSubStep(2)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Preview & Edit
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 2: Preview & Edit */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(AUDIENCE_LABELS) as GddAudience[]).map((aud) => (
              <button
                key={aud}
                onClick={() => setSelectedAudience(aud)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedAudience === aud
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {AUDIENCE_LABELS[aud].label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            {AUDIENCE_LABELS[selectedAudience].desc} — {visibleSections.length} section{visibleSections.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-4">
            {visibleSections.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                  <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    section.ready ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"
                  }`}>
                    Step {section.source_step}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                    {section.content}
                  </pre>
                </div>
                <div className="border-t border-gray-100 px-4 py-2">
                  <label className="text-xs font-medium text-gray-500">Author notes</label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    rows={2}
                    placeholder="Add notes for this section..."
                    value={customNotes[section.id] ?? ""}
                    onChange={(e) => handleNoteChange(section.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setSubStep(1)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Contents
            </button>
            <button
              onClick={() => setSubStep(3)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Export
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 3: Export */}
      {subStep === 3 && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Export Audience</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(AUDIENCE_LABELS) as GddAudience[]).map((aud) => (
                <button
                  key={aud}
                  onClick={() => setSelectedAudience(aud)}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    selectedAudience === aud
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{AUDIENCE_LABELS[aud].label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{AUDIENCE_LABELS[aud].desc.split(" — ")[1]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Export Format</h3>
            <p className="mt-1 text-xs text-gray-500">
              File: {exportFileName(gameName, selectedAudience, "pdf")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(FORMAT_LABELS) as GddFormat[]).map((fmt) => {
                const { label, icon } = FORMAT_LABELS[fmt];
                const isExporting = exportingFormat === fmt;
                const isIntegration = INTEGRATION_FORMATS.has(fmt);
                return (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    disabled={!!exportingFormat}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors disabled:opacity-50 ${
                      isIntegration
                        ? "border-gray-100 bg-gray-50 hover:bg-gray-100"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${isIntegration ? "text-gray-500" : "text-gray-900"}`}>{label}</p>
                      <p className="text-xs text-gray-500">
                        {isExporting ? "Generating..." : isIntegration ? "Coming soon" : "Click to export"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Data Attachments</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                disabled={!step5}
                onClick={() => {
                  if (!step5) return;
                  const variant = step5.rtp_variants[step5.active_variant];
                  if (!variant) return;
                  const rows = [["symbol_id", "label", "x3", "x4", "x5"]];
                  for (const entry of variant.paytable) {
                    rows.push([entry.symbol_id, entry.label, String(entry.x3), String(entry.x4), String(entry.x5)]);
                  }
                  const csv = rows.map(r => r.join(",")).join("\n");
                  downloadFile(csv, `${safeName}_paytable.csv`, "text/csv");
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 p-3 text-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-lg">📊</span>
                <span className="text-xs font-medium text-gray-700">Paytable CSV</span>
                <span className="text-[10px] text-gray-400">{step5 ? "Ready" : "Needs Step 5"}</span>
              </button>

              <button
                disabled={!step5}
                onClick={() => {
                  if (!step5) return;
                  const variant = step5.rtp_variants[step5.active_variant];
                  if (!variant) return;
                  const rows = [["reel", "symbol", "stops"]];
                  for (const [reel, strips] of Object.entries(variant.reel_strips)) {
                    for (const [sym, count] of Object.entries(strips as Record<string, number>)) {
                      rows.push([reel, sym, String(count)]);
                    }
                  }
                  const csv = rows.map(r => r.join(",")).join("\n");
                  downloadFile(csv, `${safeName}_reel_strips.csv`, "text/csv");
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 p-3 text-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-lg">🎰</span>
                <span className="text-xs font-medium text-gray-700">Reel Strips CSV</span>
                <span className="text-[10px] text-gray-400">{step5 ? "Ready" : "Needs Step 5"}</span>
              </button>

              <button
                disabled={!step5}
                onClick={() => {
                  if (!step5) return;
                  const json = JSON.stringify({
                    active_variant: step5.active_variant,
                    rtp_budget: step5.rtp_budget,
                    target_rtp_tenths: step5.target_rtp_tenths,
                    variants: step5.rtp_variants,
                  }, null, 2);
                  downloadFile(json, `${safeName}_math_model.json`, "application/json");
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 p-3 text-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-lg">{ }</span>
                <span className="text-xs font-medium text-gray-700">Math Model JSON</span>
                <span className="text-[10px] text-gray-400">{step5 ? "Ready" : "Needs Step 5"}</span>
              </button>

              <button
                disabled={!step6}
                onClick={() => {
                  if (!step6) return;
                  const json = JSON.stringify(step6, null, 2);
                  downloadFile(json, `${safeName}_simulation.json`, "application/json");
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 p-3 text-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-lg">📈</span>
                <span className="text-xs font-medium text-gray-700">Simulation JSON</span>
                <span className="text-[10px] text-gray-400">{step6 ? "Ready" : "Needs Step 6"}</span>
              </button>
            </div>
          </div>

          {/* Export history */}
          {exports.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Export History</h3>
              <div className="mt-2 space-y-1">
                {exports.map((exp, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {FORMAT_LABELS[exp.format].icon} {FORMAT_LABELS[exp.format].label} — {AUDIENCE_LABELS[exp.audience].label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(exp.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setSubStep(2)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Preview
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
