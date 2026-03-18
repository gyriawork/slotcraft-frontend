"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Step0Overview } from "@/components/wizard/step0-overview";
import { Step1Setup } from "@/components/wizard/step1-setup";
import { Step2Volatility } from "@/components/wizard/step2-volatility";
import { Step3Features } from "@/components/wizard/step3-features";
import { Step4Concept } from "@/components/wizard/step4-concept";
import { Step5Math } from "@/components/wizard/step5-math";
import { Step6Simulation } from "@/components/wizard/step6-simulation";
import { Step7Prototype } from "@/components/wizard/step7-prototype";
import { Step8Rules } from "@/components/wizard/step8-rules";
import { Step9Export } from "@/components/wizard/step9-export";
import { useWizardStore } from "@/lib/wizard-store";
import { useProjectWizard } from "@/lib/use-project-wizard";
import { useNavStore } from "@/lib/nav-store";
import { AiReview } from "@/components/wizard/ai-review";

import { HistoryPanel } from "@/components/history-panel";
import { ShareModal } from "@/components/share-modal";
import { CommentPanel } from "@/components/comment-panel";
import { WIZARD_STEPS } from "@/lib/wizard-types";

export default function ProjectWizardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { project, loading, error, saving, saveToProject } = useProjectWizard(projectId);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const {
    currentStep,
    completedSteps,
    step1, step2, step3, step4, step5, step6, step7, step8, step9,
    setStep1, setStep2, setStep3, setStep4, setStep5, setStep6, setStep7, setStep8, setStep9,
    setCurrentStep,
    stepValidity,
  } = useWizardStore();

  const { setProjectContext, clearProjectContext, setSaving } = useNavStore();

  // Stable callbacks
  const handleShare = useCallback(() => setShowShare(true), []);
  const handleComments = useCallback(() => setShowComments((v) => !v), []);
  const handleHistory = useCallback(() => setShowHistory((v) => !v), []);

  // Sync project context to nav store for the topbar
  useEffect(() => {
    if (project) {
      setProjectContext({
        projectName: project.name,
        projectType: project.game_type,
        saving,
        onSave: saveToProject,
        onShare: handleShare,
        onComments: handleComments,
        onHistory: handleHistory,
      });
    }
    return () => clearProjectContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, saving, saveToProject]);

  // Keep saving state in sync
  useEffect(() => {
    setSaving(saving);
  }, [saving, setSaving]);

  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (!loading && project && prevStepRef.current !== currentStep) {
      saveToProject();
    }
    prevStepRef.current = currentStep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <div className="rounded-lg border px-6 py-4 text-center" style={{ background: "var(--red-soft)", borderColor: "var(--red)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--red)" }}>Failed to load project</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>{error || "Project not found"}</p>
        </div>
      </div>
    );
  }

  const currentStepInfo = WIZARD_STEPS.find((s) => s.number === currentStep);

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Stale warning banner */}
      {stepValidity[currentStep] === "stale" && (
        <div
          className="flex items-center gap-2 shrink-0 px-6 py-2.5 text-[12px] border-b"
          style={{
            background: "rgba(240,176,64,.08)",
            borderColor: "rgba(240,176,64,.2)",
            color: "var(--amber)",
          }}
        >
          &#9888; This step may be outdated — an upstream step was changed. Please review.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg)", position: "relative" }}>
        {/* Step header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-semibold" style={{ color: "var(--text)" }}>
              {currentStep === 0 ? "Overview" : `Step ${currentStep} — ${currentStepInfo?.label}`}
            </h2>
          </div>
          {currentStep > 0 && (
            <AiReview
              step={currentStep}
              stepData={
                [null, step1, step2, step3, step4, step5, step6, step7, step8, step9][currentStep] as Record<string, unknown> | null
              }
              context={currentStep > 1 ? { step1, step2 } as Record<string, unknown> : undefined}
            />
          )}
        </div>

        {/* Step content card */}
        <div
          className="rounded-lg border p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {currentStep === 0 && <Step0Overview step1={step1} step2={step2} step3={step3} step4={step4} step5={step5} step6={step6} step7={step7} step8={step8} step9={step9} stepValidity={stepValidity} completedSteps={completedSteps} onGoToStep={setCurrentStep} />}
          {currentStep === 1 && <Step1Setup data={step1 ?? undefined} onUpdate={setStep1} projectId={projectId} projectDates={{ development_start: project?.development_start ?? "", development_end: project?.development_end ?? "", tech_release: project?.tech_release ?? "", pre_release: project?.pre_release ?? "", marketing_release: project?.marketing_release ?? "" }} />}
          {currentStep === 2 && <Step2Volatility data={step2 ?? undefined} onUpdate={setStep2} onBack={() => setCurrentStep(1)} />}
          {currentStep === 3 && <Step3Features data={step3 ?? undefined} onUpdate={setStep3} onBack={() => setCurrentStep(2)} markets={step1?.markets} marketConstraints={step1?.market_constraints} />}
          {currentStep === 4 && <Step4Concept data={step4 ?? undefined} onUpdate={setStep4} onBack={() => setCurrentStep(3)} gameContext={{ game_type: step1?.game_type, grid: step1?.grid, volatility: step2?.volatility, target_rtp: step2?.target_rtp, features: step3?.features?.map((f) => f.type) }} />}
          {currentStep === 5 && <Step5Math step1={step1} step2={step2} step3={step3} step4={step4} data={step5 ?? undefined} onUpdate={setStep5} onBack={() => setCurrentStep(4)} />}
          {currentStep === 6 && <Step6Simulation step1={step1} step2={step2} step3={step3} step5={step5} data={step6 ?? undefined} onUpdate={setStep6} onBack={() => setCurrentStep(5)} />}
          {currentStep === 7 && <Step7Prototype step1={step1} step2={step2} step3={step3} step5={step5} data={step7 ?? undefined} onUpdate={setStep7} onBack={() => setCurrentStep(6)} />}
          {currentStep === 8 && <Step8Rules step1={step1} step2={step2} step3={step3} step4={step4} step5={step5} step6={step6} data={step8 ?? undefined} onUpdate={setStep8} onBack={() => setCurrentStep(7)} />}
          {currentStep === 9 && <Step9Export step1={step1} step2={step2} step3={step3} step4={step4} step5={step5} step6={step6} step7={step7} data={step9 ?? undefined} onUpdate={setStep9} onBack={() => setCurrentStep(8)} />}
        </div>
      </div>

      <HistoryPanel projectId={projectId} open={showHistory} onClose={() => setShowHistory(false)} />
      <CommentPanel projectId={projectId} currentStep={currentStep} open={showComments} onClose={() => setShowComments(false)} />
      {showShare && <ShareModal projectId={projectId} onClose={() => setShowShare(false)} />}
    </div>
  );
}
