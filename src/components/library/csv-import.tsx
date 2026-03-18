"use client";

import { useCallback, useState } from "react";
import { api, type CsvImportRow } from "@/lib/api";
import {
  parseCsvText,
  parseCsvWithMapping,
  validateCsvRow,
  extractHeaders,
  extractSampleValues,
  autoDetectMapping,
  headersMatchExpected,
  EXPECTED_FIELDS,
  type FieldMapping,
} from "./csv-import-utils";

interface CsvImportProps {
  onClose: () => void;
  onImported: () => void;
}

type ImportStep = "upload" | "mapping" | "preview" | "result";

export function CsvImport({ onClose, onImported }: CsvImportProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [rawText, setRawText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleValues, setSampleValues] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [clientErrors, setClientErrors] = useState<Array<{ row: number; reason: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: Array<{ row: number; reason: string }> } | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      processText(text);
    };
    reader.readAsText(file);
  }, []);

  const handlePaste = useCallback((text: string) => {
    processText(text);
  }, []);

  function processText(text: string) {
    setRawText(text);
    const headers = extractHeaders(text);
    const samples = extractSampleValues(text);

    if (headers.length === 0) return;

    // Check if headers already match expected fields
    if (headersMatchExpected(headers)) {
      // Direct parse — no mapping needed
      finalizeParse(text);
    } else {
      // Show mapping step
      setCsvHeaders(headers);
      setSampleValues(samples);
      setFieldMapping(autoDetectMapping(headers));
      setStep("mapping");
    }
  }

  function finalizeParse(text: string, mapping?: FieldMapping) {
    const parsed = mapping ? parseCsvWithMapping(text, mapping) : parseCsvText(text);
    const errors: Array<{ row: number; reason: string }> = [];
    for (let i = 0; i < parsed.length; i++) {
      const err = validateCsvRow(parsed[i]);
      if (err) errors.push({ row: i, reason: err });
    }
    setRows(parsed);
    setClientErrors(errors);
    setStep("preview");
  }

  function handleMappingChange(csvHeader: string, targetField: string | null) {
    setFieldMapping((prev) => {
      const updated = { ...prev };
      // If another header was already mapped to this target, unmap it
      if (targetField) {
        for (const key of Object.keys(updated)) {
          if (updated[key] === targetField && key !== csvHeader) {
            updated[key] = null;
          }
        }
      }
      updated[csvHeader] = targetField;
      return updated;
    });
  }

  function handleApplyMapping() {
    finalizeParse(rawText, fieldMapping);
  }

  const handleImport = useCallback(async () => {
    const validRows = rows.filter((_, i) => !clientErrors.some((e) => e.row === i));
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await api.library.import(validRows);
      setResult(res);
      setStep("result");
      if (res.imported > 0) onImported();
    } catch (err) {
      setResult({
        imported: 0,
        errors: [{ row: -1, reason: err instanceof Error ? err.message : "Import failed" }],
      });
      setStep("result");
    } finally {
      setImporting(false);
    }
  }, [rows, clientErrors, onImported]);

  // Which expected fields are already mapped
  const usedTargets = new Set(Object.values(fieldMapping).filter(Boolean));
  // Check required fields are mapped
  const requiredMapped = EXPECTED_FIELDS.filter((f) => f.required).every((f) => usedTargets.has(f.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="mx-4 w-full max-w-3xl rounded-xl shadow-xl"
        style={{ background: "var(--surface)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Import Games from CSV
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none"
            style={{ color: "var(--text3)" }}
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4">
          {step === "upload" && (
            <div>
              <p className="mb-4 text-sm" style={{ color: "var(--text2)" }}>
                Upload a CSV file or paste CSV data. Required columns: <strong style={{ color: "var(--text)" }}>name</strong>, <strong style={{ color: "var(--text)" }}>game_type</strong>.
                Optional: rtp, volatility, reels, rows, paylines, max_win, hit_frequency, theme, status, release_date.
              </p>

              {/* File upload */}
              <label
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <svg className="h-8 w-8" style={{ color: "var(--text3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Click to upload CSV</span>
                <span className="text-xs" style={{ color: "var(--text3)" }}>or drag and drop</span>
                <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileChange} />
              </label>

              {/* Paste area */}
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium" style={{ color: "var(--text3)" }}>Or paste CSV data:</p>
                <textarea
                  className="w-full rounded-md border p-3 font-mono text-xs focus:outline-none focus:ring-1"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  rows={5}
                  placeholder={`name,game_type,rtp,volatility,theme\nFire Dragon,slot,96.0,high,fantasy\nCrash Pilot,crash,97.0,medium,aviation`}
                  onBlur={(e) => {
                    if (e.target.value.trim()) handlePaste(e.target.value);
                  }}
                />
              </div>

              {/* Download template */}
              <button
                onClick={() => {
                  const template = "name,game_type,rtp,volatility,reels,rows,paylines,max_win,hit_frequency,theme,status,release_date\n";
                  const blob = new Blob([template], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "slotcraft_import_template.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-3 text-xs font-medium underline"
                style={{ color: "var(--accent)" }}
              >
                Download CSV template
              </button>
            </div>
          )}

          {step === "mapping" && (
            <div>
              <p className="mb-1 text-sm font-medium" style={{ color: "var(--text)" }}>
                Map CSV Columns
              </p>
              <p className="mb-4 text-xs" style={{ color: "var(--text2)" }}>
                Your CSV headers don't match the expected fields. Map each column to the correct database field, or skip columns you don't need.
              </p>

              <div
                className="max-h-80 overflow-auto rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0" style={{ background: "var(--bg)" }}>
                    <tr>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>CSV Column</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Sample Value</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>→</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Database Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvHeaders.map((header, i) => {
                      const mapped = fieldMapping[header];
                      return (
                        <tr
                          key={header}
                          className="border-t"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td className="px-3 py-2 font-mono font-medium" style={{ color: "var(--text)" }}>
                            {header}
                          </td>
                          <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "var(--text3)" }}>
                            {sampleValues[i] || "—"}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--text3)" }}>→</td>
                          <td className="px-3 py-2">
                            <select
                              value={mapped ?? "__skip__"}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleMappingChange(header, val === "__skip__" ? null : val);
                              }}
                              className="w-full rounded-md border px-2 py-1 text-xs"
                              style={{
                                background: "var(--bg)",
                                borderColor: "var(--border)",
                                color: mapped ? "var(--text)" : "var(--text3)",
                              }}
                            >
                              <option value="__skip__">— Skip —</option>
                              {EXPECTED_FIELDS.map((f) => {
                                const taken = usedTargets.has(f.key) && mapped !== f.key;
                                return (
                                  <option key={f.key} value={f.key} disabled={taken}>
                                    {f.label}{f.required ? " *" : ""}{taken ? " (used)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!requiredMapped && (
                <p className="mt-3 text-xs" style={{ color: "var(--red)" }}>
                  Required fields must be mapped: {EXPECTED_FIELDS.filter((f) => f.required && !usedTargets.has(f.key)).map((f) => f.label).join(", ")}
                </p>
              )}
            </div>
          )}

          {step === "preview" && (
            <div>
              <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>
                {rows.length} row{rows.length !== 1 ? "s" : ""} parsed.
                {clientErrors.length > 0 && (
                  <span className="ml-1" style={{ color: "var(--amber)" }}>
                    {clientErrors.length} with errors (will be skipped).
                  </span>
                )}
              </p>

              <div
                className="max-h-80 overflow-auto rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <table className="min-w-full divide-y text-xs" style={{ borderColor: "var(--border)" }}>
                  <thead className="sticky top-0" style={{ background: "var(--bg)" }}>
                    <tr>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>#</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Name</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Type</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>RTP</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Volatility</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Theme</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text2)" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const err = clientErrors.find((e) => e.row === i);
                      return (
                        <tr
                          key={i}
                          className="border-t"
                          style={{
                            borderColor: "var(--border)",
                            background: err ? "var(--red-soft)" : undefined,
                          }}
                        >
                          <td className="px-3 py-2" style={{ color: "var(--text3)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-medium" style={{ color: "var(--text)" }}>{row.name}</td>
                          <td className="px-3 py-2" style={{ color: "var(--text2)" }}>{row.game_type}</td>
                          <td className="px-3 py-2" style={{ color: "var(--text2)" }}>{row.rtp ?? "—"}</td>
                          <td className="px-3 py-2" style={{ color: "var(--text2)" }}>{row.volatility ?? "—"}</td>
                          <td className="px-3 py-2" style={{ color: "var(--text2)" }}>{row.theme ?? "—"}</td>
                          <td className="px-3 py-2">
                            {err ? (
                              <span style={{ color: "var(--red)" }}>{err.reason}</span>
                            ) : (
                              <span style={{ color: "var(--green)" }}>Valid</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div>
              {result.imported > 0 ? (
                <div
                  className="mb-4 rounded-lg border p-4"
                  style={{ background: "var(--green-soft)", borderColor: "var(--green)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--green)" }}>
                    Successfully imported {result.imported} game{result.imported !== 1 ? "s" : ""}.
                  </p>
                </div>
              ) : (
                <div
                  className="mb-4 rounded-lg border p-4"
                  style={{ background: "var(--red-soft)", borderColor: "var(--red)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--red)" }}>No games imported.</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div
                  className="rounded-lg border p-4"
                  style={{ background: "var(--amber-soft)", borderColor: "var(--amber)" }}
                >
                  <p className="text-sm font-medium mb-2" style={{ color: "var(--amber)" }}>
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: "var(--amber)" }}>
                    {result.errors.map((e, i) => (
                      <li key={i}>Row {e.row + 1}: {e.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 border-t px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          {step === "mapping" && (
            <button
              onClick={() => { setStep("upload"); setRawText(""); setCsvHeaders([]); setSampleValues([]); setFieldMapping({}); }}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            >
              Back
            </button>
          )}
          {step === "preview" && (
            <button
              onClick={() => {
                // Go back to mapping if we came from there, otherwise upload
                if (csvHeaders.length > 0) {
                  setStep("mapping");
                } else {
                  setStep("upload");
                  setRows([]);
                  setClientErrors([]);
                }
              }}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            >
              Back
            </button>
          )}
          {step === "upload" && (
            <button
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            >
              Cancel
            </button>
          )}
          {step === "mapping" && (
            <button
              onClick={handleApplyMapping}
              disabled={!requiredMapped}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              Apply Mapping
            </button>
          )}
          {step === "preview" && (
            <button
              onClick={handleImport}
              disabled={importing || rows.length === clientErrors.length}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {importing ? "Importing..." : `Import ${rows.length - clientErrors.length} Games`}
            </button>
          )}
          {step === "result" && (
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
