"use client";

import { WIZARD_STEPS, type StepValidity } from "@/lib/wizard-types";

interface WizardNavProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
  stepValidity?: Record<number, StepValidity>;
}

export function WizardNav({
  currentStep,
  onStepClick,
  completedSteps = [],
  stepValidity = {},
}: WizardNavProps) {
  return (
    <nav
      className="flex items-center gap-0.5 overflow-x-auto border-b px-4 scrollbar-hide"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        maskImage: "linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
      }}
    >
      {WIZARD_STEPS.map((step) => {
        const isActive = step.number === currentStep;
        const isCompleted = completedSteps.includes(step.number);
        const isStale = stepValidity[step.number] === "stale";
        const maxReachable = Math.max(currentStep, ...completedSteps, 0);
        const isClickable = onStepClick && (isCompleted || step.number <= maxReachable + 1);

        return (
          <button
            key={step.number}
            onClick={() => isClickable && onStepClick?.(step.number)}
            disabled={!isClickable}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors ${
              isClickable ? "cursor-pointer" : "cursor-default"
            }`}
            style={{
              borderBottomColor: isActive ? "var(--accent)" : "transparent",
              color: isActive
                ? "var(--accent)"
                : isStale
                ? "var(--amber)"
                : isCompleted
                ? "var(--text)"
                : "var(--text3)",
            }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
              style={{
                background: isActive
                  ? "var(--accent)"
                  : isStale
                  ? "var(--amber-soft)"
                  : isCompleted
                  ? "var(--green-soft)"
                  : "var(--bg2)",
                color: isActive
                  ? "#fff"
                  : isStale
                  ? "var(--amber)"
                  : isCompleted
                  ? "var(--green)"
                  : "var(--text3)",
              }}
            >
              {isStale ? "!" : isCompleted ? "✓" : step.number}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
