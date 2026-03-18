export interface ProjectRecord {
  id: string;
  name: string;
  game_type: "slot" | "crash" | "table";
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
  completed_steps: number;
  current_step: number;
  step_data: Record<string, unknown>;
  development_start: string | null;
  development_end: string | null;
  tech_release: string | null;
  pre_release: string | null;
  marketing_release: string | null;
}

const SAMPLE_PROJECTS: ProjectRecord[] = [
  {
    id: "proj-001",
    name: "Tempest of Quetzalcoatl",
    game_type: "slot",
    status: "active",
    created_at: "2025-11-15T10:00:00Z",
    updated_at: "2026-03-01T14:30:00Z",
    completed_steps: 9,
    current_step: 9,
    step_data: {
      step1: { game_type: "slot", grid: { reels: 5, rows: 3 }, paylines: 20, name: "Tempest of Quetzalcoatl" },
      step2: { target_rtp: 96.0, volatility: "med-high" },
      step3: { features: ["Free Spins", "Wild Substitution", "Scatter Pay"] },
    },
    development_start: "2025-11-15",
    development_end: "2026-02-28",
    tech_release: "2026-03-15",
    pre_release: "2026-04-01",
    marketing_release: "2026-04-15",
  },
  {
    id: "proj-002",
    name: "Love & Luck Joker",
    game_type: "slot",
    status: "active",
    created_at: "2025-12-01T09:00:00Z",
    updated_at: "2026-03-16T11:00:00Z",
    completed_steps: 9,
    current_step: 9,
    step_data: {
      step1: { game_type: "slot", grid: { reels: 5, rows: 3 }, paylines: 10, name: "Love & Luck Joker" },
      step2: { target_rtp: 96.0, volatility: "high" },
      step3: { features: ["Free Spins", "Wild Substitution", "Multiplier"] },
    },
    development_start: "2025-12-01",
    development_end: "2026-03-15",
    tech_release: "2026-04-01",
    pre_release: "2026-04-20",
    marketing_release: "2026-05-01",
  },
  {
    id: "proj-003",
    name: "Neon Samurai X",
    game_type: "slot",
    status: "active",
    created_at: "2025-12-10T08:00:00Z",
    updated_at: "2026-04-05T16:00:00Z",
    completed_steps: 9,
    current_step: 9,
    step_data: {
      step1: { game_type: "slot", grid: { reels: 6, rows: 4 }, paylines: 50, name: "Neon Samurai X" },
      step2: { target_rtp: 96.5, volatility: "high" },
      step3: { features: ["Free Spins", "Cascading Reels", "Wild Substitution", "Multiplier"] },
    },
    development_start: "2025-12-10",
    development_end: "2026-04-05",
    tech_release: "2026-05-01",
    pre_release: "2026-05-15",
    marketing_release: "2026-06-01",
  },
  {
    id: "proj-004",
    name: "Rocket Blitz",
    game_type: "crash",
    status: "active",
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
    completed_steps: 5,
    current_step: 5,
    step_data: {
      step1: { game_type: "crash", name: "Rocket Blitz" },
      step2: { target_rtp: 97.0 },
    },
    development_start: "2026-01-05",
    development_end: "2026-05-01",
    tech_release: "2026-04-05",
    pre_release: null,
    marketing_release: null,
  },
  {
    id: "proj-005",
    name: "Dragon Palace Megaways",
    game_type: "slot",
    status: "active",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
    completed_steps: 4,
    current_step: 4,
    step_data: {
      step1: { game_type: "slot", grid: { reels: 6, rows: 7 }, paylines: 117649, name: "Dragon Palace Megaways" },
      step2: { target_rtp: 96.2, volatility: "ultra" },
      step3: { features: ["Megaways", "Free Spins", "Cascading Reels", "Multiplier"] },
    },
    development_start: "2026-01-20",
    development_end: "2026-06-15",
    tech_release: "2026-05-20",
    pre_release: null,
    marketing_release: null,
  },
  {
    id: "proj-006",
    name: "Lightning Blackjack Pro",
    game_type: "table",
    status: "active",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
    completed_steps: 3,
    current_step: 3,
    step_data: {
      step1: { game_type: "table", name: "Lightning Blackjack Pro" },
      step2: { target_rtp: 99.1, volatility: "low" },
    },
    development_start: "2026-02-01",
    development_end: "2026-07-01",
    tech_release: "2026-06-15",
    pre_release: null,
    marketing_release: null,
  },
  {
    id: "proj-007",
    name: "Aztec Gold Rush",
    game_type: "slot",
    status: "draft",
    created_at: "2026-02-15T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
    completed_steps: 3,
    current_step: 3,
    step_data: {
      step1: { game_type: "slot", grid: { reels: 5, rows: 3 }, paylines: 25, name: "Aztec Gold Rush" },
      step2: { target_rtp: 95.5, volatility: "med" },
      step3: { features: ["Free Spins", "Wild Substitution", "Scatter Pay"] },
    },
    development_start: null,
    development_end: null,
    tech_release: null,
    pre_release: null,
    marketing_release: null,
  },
  {
    id: "proj-008",
    name: "Fortune Tiger 88",
    game_type: "slot",
    status: "draft",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
    completed_steps: 1,
    current_step: 1,
    step_data: {
      step1: { game_type: "slot", grid: { reels: 5, rows: 3 }, paylines: 88, name: "Fortune Tiger 88" },
    },
    development_start: null,
    development_end: null,
    tech_release: null,
    pre_release: null,
    marketing_release: null,
  },
];

// In-memory store (shared across all API routes in the same server process)
export const projectsStore = {
  data: [...SAMPLE_PROJECTS] as ProjectRecord[],

  list() {
    return this.data;
  },

  get(id: string) {
    return this.data.find((p) => p.id === id) ?? null;
  },

  create(input: { name: string; game_type: string; development_start?: string | null; development_end?: string | null; tech_release?: string | null; pre_release?: string | null; marketing_release?: string | null }) {
    const project: ProjectRecord = {
      id: `proj-${Date.now()}`,
      name: input.name || "Untitled Project",
      game_type: (input.game_type as ProjectRecord["game_type"]) || "slot",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_steps: 0,
      current_step: 1,
      step_data: {},
      development_start: input.development_start ?? null,
      development_end: input.development_end ?? null,
      tech_release: input.tech_release ?? null,
      pre_release: input.pre_release ?? null,
      marketing_release: input.marketing_release ?? null,
    };
    this.data.unshift(project);
    return project;
  },

  update(id: string, patch: Partial<Pick<ProjectRecord, "name" | "status" | "step_data" | "development_start" | "development_end" | "tech_release" | "pre_release" | "marketing_release">>) {
    const project = this.get(id);
    if (!project) return null;
    if (patch.name !== undefined) project.name = patch.name;
    if (patch.status !== undefined) project.status = patch.status;
    if (patch.development_start !== undefined) project.development_start = patch.development_start;
    if (patch.development_end !== undefined) project.development_end = patch.development_end;
    if (patch.tech_release !== undefined) project.tech_release = patch.tech_release;
    if (patch.pre_release !== undefined) project.pre_release = patch.pre_release;
    if (patch.marketing_release !== undefined) project.marketing_release = patch.marketing_release;
    if (patch.step_data !== undefined) {
      project.step_data = { ...project.step_data, ...patch.step_data };
      // Auto-update completed_steps and current_step based on step_data keys (step1..step9 only)
      const stepKeys = Object.keys(project.step_data).filter((k) => /^step[1-9]$/.test(k));
      project.completed_steps = stepKeys.length;
      project.current_step = stepKeys.length > 0
        ? Math.min(9, Math.max(...stepKeys.map((k) => parseInt(k.replace("step", ""), 10))))
        : 1;
    }
    project.updated_at = new Date().toISOString();
    return project;
  },

  archive(id: string) {
    const project = this.get(id);
    if (!project) return false;
    project.status = "archived";
    project.updated_at = new Date().toISOString();
    return true;
  },

  duplicate(id: string) {
    const source = this.get(id);
    if (!source) return null;
    const copy: ProjectRecord = {
      ...structuredClone(source),
      id: `proj-${Date.now()}`,
      name: `${source.name} (copy)`,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.unshift(copy);
    return copy;
  },
};
