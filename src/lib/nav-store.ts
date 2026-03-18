import { create } from "zustand";

/** Lightweight store for topbar to know about the active wizard project context */
interface NavStore {
  /** Project name to show in topbar (null = not on wizard page) */
  projectName: string | null;
  /** Project game type for icon */
  projectType: string | null;
  /** Whether save is in progress */
  saving: boolean;
  /** Callbacks set by the wizard page */
  onSave: (() => void) | null;
  onShare: (() => void) | null;
  onComments: (() => void) | null;
  onHistory: (() => void) | null;

  setProjectContext: (ctx: {
    projectName: string;
    projectType: string;
    saving: boolean;
    onSave: () => void;
    onShare: () => void;
    onComments: () => void;
    onHistory: () => void;
  }) => void;
  clearProjectContext: () => void;
  setSaving: (saving: boolean) => void;
}

export const useNavStore = create<NavStore>((set) => ({
  projectName: null,
  projectType: null,
  saving: false,
  onSave: null,
  onShare: null,
  onComments: null,
  onHistory: null,

  setProjectContext: (ctx) =>
    set({
      projectName: ctx.projectName,
      projectType: ctx.projectType,
      saving: ctx.saving,
      onSave: ctx.onSave,
      onShare: ctx.onShare,
      onComments: ctx.onComments,
      onHistory: ctx.onHistory,
    }),

  clearProjectContext: () =>
    set({
      projectName: null,
      projectType: null,
      saving: false,
      onSave: null,
      onShare: null,
      onComments: null,
      onHistory: null,
    }),

  setSaving: (saving) => set({ saving }),
}));
