"use client";

import { WIZARD_STEPS } from "@/lib/wizard-types";

interface WizardStepBarProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function WizardStepBar({ currentStep, completedSteps, onStepClick }: WizardStepBarProps) {
  return (
    <div
      className="flex h-[44px] shrink-0 items-center overflow-x-auto px-6 border-b"
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
    >
      {WIZARD_STEPS.map((step, i) => {
        const isActive = currentStep === step.number;
        const isDone = completedSteps.includes(step.number);

        return (
          <div key={step.number} className="flex items-center shrink-0">
            {/* Connector line between steps */}
            {i > 0 && (
              <div
                className="mx-0 h-px shrink-0"
                style={{
                  width: 16,
                  background: isDone || completedSteps.includes(WIZARD_STEPS[i - 1].number)
                    ? "var(--green)"
                    : "var(--border)",
                  opacity: isDone || completedSteps.includes(WIZARD_STEPS[i - 1].number) ? 0.3 : 1,
                }}
              />
            )}

            {/* Step item */}
            <button
              onClick={() => onStepClick(step.number)}
              className="flex items-center gap-[7px] rounded-md px-3.5 py-1.5 text-[12.5px] whitespace-nowrap transition-all duration-100"
              style={{
                background: isActive ? "var(--accent-soft)" : "transparent",
                color: isActive
                  ? "var(--accent)"
                  : isDone
                  ? "var(--green)"
                  : "var(--text3)",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-semibold"
                style={{
                  border: "0.5px solid",
                  borderColor: isActive
                    ? "var(--accent-border)"
                    : isDone
                    ? "var(--green-border)"
                    : "var(--border)",
                  color: isActive
                    ? "var(--accent)"
                    : isDone
                    ? "var(--green)"
                    : "var(--text3)",
                  background: isActive
                    ? "var(--accent-soft)"
                    : isDone
                    ? "var(--green-soft)"
                    : "transparent",
                }}
              >
                {step.number === 0 ? "\u2630" : isDone ? "✓" : step.number}
              </span>
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
