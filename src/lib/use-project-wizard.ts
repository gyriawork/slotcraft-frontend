"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Project } from "./api";
import { useWizardStore } from "./wizard-store";

/**
 * Hook that syncs wizard store state with a backend project's step_data.
 * - On mount: loads project step_data into the wizard store.
 * - On step completion: saves step_data back to the project.
 */
export function useProjectWizard(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  const store = useWizardStore();

  // Load project + hydrate wizard store
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const proj = await api.projects.get(projectId);
        setProject(proj);

        // Hydrate wizard store from step_data
        const sd = proj.step_data ?? {};
        if (sd.step1) store.setStep1(sd.step1 as Parameters<typeof store.setStep1>[0]);
        if (sd.step2) store.setStep2(sd.step2 as Parameters<typeof store.setStep2>[0]);
        if (sd.step3) store.setStep3(sd.step3 as Parameters<typeof store.setStep3>[0]);
        if (sd.step4) store.setStep4(sd.step4 as Parameters<typeof store.setStep4>[0]);
        if (sd.step5) store.setStep5(sd.step5 as Parameters<typeof store.setStep5>[0]);
        if (sd.step6) store.setStep6(sd.step6 as Parameters<typeof store.setStep6>[0]);
        if (sd.step7) store.setStep7(sd.step7 as Parameters<typeof store.setStep7>[0]);
        if (sd.step8) store.setStep8(sd.step8 as Parameters<typeof store.setStep8>[0]);
        if (sd.step9) store.setStep9(sd.step9 as Parameters<typeof store.setStep9>[0]);
        if (typeof sd.currentStep === "number") store.setCurrentStep(sd.currentStep as number);

        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Save current wizard state to backend
  const saveToProject = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      const state = useWizardStore.getState();
      const stepData: Record<string, unknown> = {
        step1: state.step1,
        step2: state.step2,
        step3: state.step3,
        step4: state.step4,
        step5: state.step5,
        step6: state.step6,
        step7: state.step7,
        step8: state.step8,
        step9: state.step9,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        stepValidity: state.stepValidity,
      };
      const updated = await api.projects.update(project.id, { step_data: stepData });
      setProject(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [project]);

  return { project, loading, error, saving, saveToProject };
}
