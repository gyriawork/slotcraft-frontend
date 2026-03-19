"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Project } from "./api";
import { useWizardStore } from "./wizard-store";

/**
 * Hook that syncs wizard store state with a backend project's step_data.
 * - On mount (or projectId change): loads project step_data into the wizard store.
 * - On step completion: saves step_data back to the project.
 *
 * IMPORTANT: hydration is done atomically via Zustand setState to avoid
 * intermediate renders where step1 is null (which crashes Step5-9 components).
 */
export function useProjectWizard(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastLoadedId = useRef<string | null>(null);

  // Load project + hydrate wizard store (re-runs when projectId changes)
  useEffect(() => {
    if (lastLoadedId.current === projectId) return;
    lastLoadedId.current = projectId;
    setLoading(true);

    (async () => {
      try {
        const proj = await api.projects.get(projectId);
        setProject(proj);

        // Hydrate wizard store ATOMICALLY — one setState call to avoid
        // intermediate renders where step data is null
        const sd = proj.step_data ?? {};
        useWizardStore.setState({
          currentStep: typeof sd.currentStep === "number" ? (sd.currentStep as number) : 1,
          completedSteps: (sd.completedSteps as number[]) ?? [],
          stepValidity: (sd.stepValidity ?? {}) as Record<number, "valid" | "stale">,
          step1: (sd.step1 as ReturnType<typeof useWizardStore.getState>["step1"]) ?? null,
          step2: (sd.step2 as ReturnType<typeof useWizardStore.getState>["step2"]) ?? null,
          step3: (sd.step3 as ReturnType<typeof useWizardStore.getState>["step3"]) ?? null,
          step4: (sd.step4 as ReturnType<typeof useWizardStore.getState>["step4"]) ?? null,
          step5: (sd.step5 as ReturnType<typeof useWizardStore.getState>["step5"]) ?? null,
          step6: (sd.step6 as ReturnType<typeof useWizardStore.getState>["step6"]) ?? null,
          step7: (sd.step7 as ReturnType<typeof useWizardStore.getState>["step7"]) ?? null,
          step8: (sd.step8 as ReturnType<typeof useWizardStore.getState>["step8"]) ?? null,
          step9: (sd.step9 as ReturnType<typeof useWizardStore.getState>["step9"]) ?? null,
        });

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
