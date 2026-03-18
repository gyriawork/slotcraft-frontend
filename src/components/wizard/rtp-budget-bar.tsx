"use client";

import { useCallback, useRef, useState } from "react";
import type { RtpBudget } from "@/lib/wizard-types";

const SEGMENTS = [
  { key: "base_wins" as const, label: "Base Game", color: "bg-blue-500" },
  { key: "wild_substitution" as const, label: "Wilds", color: "bg-green-500" },
  { key: "free_spins" as const, label: "Free Spins", color: "bg-purple-500" },
  { key: "accumulator" as const, label: "Accumulator", color: "bg-orange-500" },
];

/** Minimum segment size: 1.0% = 10 tenths */
const MIN_TENTHS = 10;

interface Props {
  /** All values in integer tenths of percent (538 = 53.8%) */
  budget: RtpBudget;
  /** Target RTP in integer tenths (960 = 96.0%) */
  targetTenths: number;
  onChange: (budget: RtpBudget) => void;
}

/** Format tenths-of-percent integer to display string: 538 → "53.8%" */
function fmt(tenths: number): string {
  return (tenths / 10).toFixed(1) + "%";
}

export function RtpBudgetBar({ budget, targetTenths, onChange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const keys = SEGMENTS.map((s) => s.key);
  const values = keys.map((k) => budget[k]);
  const total = values.reduce((a, b) => a + b, 0);

  /** Handle drag on a divider between segment[i] and segment[i+1] */
  const onPointerDown = useCallback(
    (dividerIndex: number, e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(dividerIndex);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pxFromLeft = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const fraction = pxFromLeft / rect.width;
      const posInTenths = Math.round(fraction * targetTenths);

      // Sum of segments before the divider
      const newValues = [...values];
      const sumBefore = newValues.slice(0, dragging).reduce((a, b) => a + b, 0);
      const sumAfter = newValues.slice(dragging + 2).reduce((a, b) => a + b, 0);

      let leftVal = posInTenths - sumBefore;
      let rightVal = targetTenths - posInTenths - sumAfter;

      // Clamp both segments to minimum
      if (leftVal < MIN_TENTHS) leftVal = MIN_TENTHS;
      if (rightVal < MIN_TENTHS) rightVal = MIN_TENTHS;

      // Check if the drag is valid (doesn't violate constraints)
      if (leftVal + rightVal + sumBefore + sumAfter > targetTenths) return;

      newValues[dragging] = leftVal;
      newValues[dragging + 1] = rightVal;

      // Derive last segment to guarantee exact total
      const sumExceptLast = newValues.slice(0, -1).reduce((a, b) => a + b, 0);
      newValues[newValues.length - 1] = targetTenths - sumExceptLast;

      if (newValues[newValues.length - 1] < MIN_TENTHS) return;

      onChange({
        base_wins: newValues[0],
        wild_substitution: newValues[1],
        free_spins: newValues[2],
        accumulator: newValues[3],
      });
    },
    [dragging, values, targetTenths, onChange]
  );

  const onPointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">RTP Budget Allocator</h4>
        <span className="text-sm font-medium text-gray-600">
          Total: {fmt(total)} / {fmt(targetTenths)}
        </span>
      </div>

      {/* Draggable bar */}
      <div
        ref={barRef}
        className="relative flex h-10 overflow-hidden rounded-lg"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {SEGMENTS.map((seg, i) => {
          const widthPct = (values[i] / targetTenths) * 100;
          return (
            <div key={seg.key} className="relative flex items-center" style={{ width: `${widthPct}%` }}>
              <div className={`h-full w-full ${seg.color} flex items-center justify-center`}>
                <span className="text-xs font-medium text-white truncate px-1">
                  {fmt(values[i])}
                </span>
              </div>
              {/* Drag handle between segments (not after last) */}
              {i < SEGMENTS.length - 1 && (
                <div
                  className="absolute right-0 top-0 z-10 h-full w-3 cursor-col-resize translate-x-1/2"
                  onPointerDown={(e) => onPointerDown(i, e)}
                >
                  <div className="mx-auto h-full w-0.5 bg-white/80" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {SEGMENTS.map((seg, i) => (
          <div key={seg.key} className="flex items-center gap-2 text-xs text-gray-600">
            <div className={`h-3 w-3 rounded-sm ${seg.color}`} />
            <span>{seg.label}: {fmt(values[i])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
