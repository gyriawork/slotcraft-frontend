"use client";

import { useCallback, useState } from "react";
import type { ProductSheetData } from "./product-sheet-utils";
import { buildProductSheetData } from "./product-sheet-utils";

interface Props {
  wizardData: Record<string, unknown>;
  gameName: string;
}

export function ProductSheetViewer({ wizardData, gameName }: Props) {
  const [generating, setGenerating] = useState(false);
  const sheet = buildProductSheetData(wizardData, gameName);

  const handleDownloadPdf = useCallback(async () => {
    setGenerating(true);
    try {
      const { generateProductSheetPdf } = await import("./product-sheet-pdf");
      const blob = await generateProductSheetPdf(sheet);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${gameName.replace(/\s+/g, "_")}_Product_Sheet.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [sheet, gameName]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Product Sheet</h3>
          <p className="text-sm text-gray-500">Auto-generated from your wizard data</p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={generating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {/* Preview card */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Page 1 preview */}
        <div className="p-8 border-b border-gray-100">
          <div className="mb-1">
            <h2 className="text-2xl font-bold text-blue-900">{sheet.title}</h2>
            <p className="text-sm text-gray-500">{sheet.game_type}</p>
          </div>
          {sheet.simulation_verified && (
            <span className="inline-block mt-2 rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
              MATH VERIFIED
            </span>
          )}

          {sheet.description && (
            <div className="mt-6 rounded-lg bg-gray-50 border-l-4 border-blue-500 p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Game Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{sheet.description}</p>
            </div>
          )}

          {sheet.features.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {sheet.features.map((f, i) => (
                  <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Page 2 preview — specs grid */}
        <div className="p-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Technical Specifications</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SpecCard label="RTP" value={sheet.rtp} />
            <SpecCard label="Volatility" value={sheet.volatility} />
            <SpecCard label="Max Win" value={sheet.max_win} />
            <SpecCard label="Grid" value={sheet.grid} />
            <SpecCard label="Paylines" value={sheet.paylines} />
            <SpecCard label="Hit Frequency" value={sheet.hit_frequency} />
            <SpecCard label="Bet Range" value={sheet.bet_range} />
            {sheet.simulation_verified && (
              <SpecCard label="Sim Spins" value={sheet.simulation_spins} />
            )}
          </div>

          {sheet.markets.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Markets</p>
              <div className="flex flex-wrap gap-2">
                {sheet.markets.map((m, i) => (
                  <span key={i} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 capitalize">
                    {m.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
