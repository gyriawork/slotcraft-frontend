"use client";

import { WizardNav } from "@/components/wizard/wizard-nav";
import { Step1Setup } from "@/components/wizard/step1-setup";
import { Step2Volatility } from "@/components/wizard/step2-volatility";
import { Step3Features } from "@/components/wizard/step3-features";
import { Step4Concept } from "@/components/wizard/step4-concept";
import { Step5Math } from "@/components/wizard/step5-math";
import { Step6Simulation } from "@/components/wizard/step6-simulation";
import { Step7Prototype } from "@/components/wizard/step7-prototype";
import { Step8Rules } from "@/components/wizard/step8-rules";
import { Step9Export } from "@/components/wizard/step9-export";
import { useEffect, useRef } from "react";
import { useWizardStore } from "@/lib/wizard-store";

export default function NewGamePage() {
  const resetRef = useRef(false);
  useEffect(() => {
    if (!resetRef.current) {
      resetRef.current = true;
      useWizardStore.getState().reset();
    }
  }, []);

  const {
    currentStep,
    completedSteps,
    step1,
    step2,
    step3,
    step4,
    step5,
    step6,
    step7,
    step8,
    step9,
    setStep1,
    setStep2,
    setStep3,
    setStep4,
    setStep5,
    setStep6,
    setStep7,
    setStep8,
    setStep9,
    setCurrentStep,
    stepValidity,
  } = useWizardStore();

  return (
    <div className="-mx-6 -mb-6 flex h-full flex-col overflow-hidden">
      <WizardNav
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        completedSteps={completedSteps}
        stepValidity={stepValidity}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {stepValidity[currentStep] === "stale" && (
          <div
            className="mb-4 rounded-lg border px-4 py-3"
            style={{ background: "var(--amber-soft)", borderColor: "var(--amber-border)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>
              This step may be outdated — an upstream step was changed. Please review and re-save.
            </p>
          </div>
        )}
        {currentStep === 1 && (
          <Step1Setup data={step1 ?? undefined} onUpdate={setStep1} />
        )}
        {currentStep === 2 && (
          <Step2Volatility
            data={step2 ?? undefined}
            onUpdate={setStep2}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3Features
            data={step3 ?? undefined}
            onUpdate={setStep3}
            onBack={() => setCurrentStep(2)}
            markets={step1?.markets}
            marketConstraints={step1?.market_constraints}
          />
        )}
        {currentStep === 4 && (
          <Step4Concept
            data={step4 ?? undefined}
            onUpdate={setStep4}
            onBack={() => setCurrentStep(3)}
            gameContext={{ game_type: step1?.game_type, grid: step1?.grid, volatility: step2?.volatility, target_rtp: step2?.target_rtp, features: step3?.features?.map((f) => f.type) }}
          />
        )}
        {currentStep === 5 && (
          <Step5Math
            step1={step1}
            step2={step2}
            step3={step3}
            step4={step4}
            data={step5 ?? undefined}
            onUpdate={setStep5}
            onBack={() => setCurrentStep(4)}
          />
        )}
        {currentStep === 6 && (
          <Step6Simulation
            step1={step1}
            step2={step2}
            step3={step3}
            step5={step5}
            data={step6 ?? undefined}
            onUpdate={setStep6}
            onBack={() => setCurrentStep(5)}
          />
        )}
        {currentStep === 7 && (
          <Step7Prototype
            step1={step1}
            step2={step2}
            step3={step3}
            step5={step5}
            data={step7 ?? undefined}
            onUpdate={setStep7}
            onBack={() => setCurrentStep(6)}
          />
        )}
        {currentStep === 8 && (
          <Step8Rules
            step1={step1}
            step2={step2}
            step3={step3}
            step4={step4}
            step5={step5}
            step6={step6}
            data={step8 ?? undefined}
            onUpdate={setStep8}
            onBack={() => setCurrentStep(7)}
          />
        )}
        {currentStep === 9 && (
          <Step9Export
            step1={step1}
            step2={step2}
            step3={step3}
            step4={step4}
            step5={step5}
            step6={step6}
            step7={step7}
            data={step9 ?? undefined}
            onUpdate={setStep9}
            onBack={() => setCurrentStep(8)}
          />
        )}
      </div>
    </div>
  );
}
