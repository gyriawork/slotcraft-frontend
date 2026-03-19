import type { LibraryGame, Project } from "@/lib/api";
import { TOTAL_WIZARD_STEPS } from "@/lib/constants";

export type GameType = "slot" | "crash" | "table";
export type GameStatus = "released" | "dev" | "concept" | "qa" | "delayed";
export type ViewMode = "gantt" | "list";

export interface RoadmapGame {
  id?: string;
  name: string;
  type: GameType;
  team: string;
  status: GameStatus;
  rtp: string;
  volatility: string;
  /** 0-based month index for dev start (0=Jan, 11=Dec) */
  devStartMonth: number;
  /** 0-based month index for dev end */
  devEndMonth: number;
  /** 0-based month index for tech release */
  techReleaseMonth: number;
  /** 0-based month index for marketing release */
  marketingReleaseMonth: number;
  techDate: string;
  marketingDate: string;
  /** Wizard progress, e.g. "5/9" */
  wizardStep: string;
  /** Source: "library", "project", or "sample" */
  source: "library" | "project" | "sample";
  /** Year the game's dates belong to */
  year: number;
}

/* ─── Converters: real data → RoadmapGame ─── */

function formatMonthDay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Map LibraryGame status → RoadmapGame status */
function mapLibraryStatus(s: LibraryGame["status"]): GameStatus {
  switch (s) {
    case "live": return "released";
    case "development": return "dev";
    case "concept": return "concept";
    case "archived": return "released";
    default: return "concept";
  }
}

/** Map Project status → RoadmapGame status */
function mapProjectStatus(s: Project["status"], completedSteps?: number, totalSteps = TOTAL_WIZARD_STEPS): GameStatus {
  if (s === "archived") return "released";
  if (s === "active" && completedSteps !== undefined && completedSteps >= totalSteps) return "released";
  if (s === "active") return "dev";
  return "concept";
}

/**
 * Convert a LibraryGame to a RoadmapGame.
 * Timeline is estimated from created_at / release_date / updated_at.
 */
export function libraryGameToRoadmap(game: LibraryGame): RoadmapGame {
  const created = new Date(game.created_at);
  const updated = new Date(game.updated_at);
  const release = game.release_date ? new Date(game.release_date) : null;

  const devStartMonth = created.getMonth() + (created.getDate() / 30);

  // Estimate dev end: either release date or updated_at + 2 months
  let devEndMonth: number;
  let techReleaseMonth: number;
  let marketingReleaseMonth: number;
  let techDate: string;
  let marketingDate: string;

  if (release) {
    const relMonth = release.getMonth() + (release.getDate() / 30);
    devEndMonth = relMonth;
    techReleaseMonth = relMonth;
    marketingReleaseMonth = Math.min(12, relMonth + 0.5);
    techDate = formatMonthDay(release);
    const mktDate = new Date(release);
    mktDate.setDate(mktDate.getDate() + 15);
    marketingDate = formatMonthDay(mktDate);
  } else {
    // Estimate: dev lasts ~3 months from creation, then tech + marketing
    const estimated = created.getMonth() + 3;
    devEndMonth = Math.min(12, estimated);
    techReleaseMonth = devEndMonth;
    marketingReleaseMonth = Math.min(12, devEndMonth + 0.5);
    const techD = new Date(created);
    techD.setMonth(techD.getMonth() + 3);
    techDate = formatMonthDay(techD);
    const mktD = new Date(techD);
    mktD.setDate(mktD.getDate() + 15);
    marketingDate = formatMonthDay(mktD);
  }

  // Extract RTP and volatility from parameters if available
  const params = game.parameters ?? {};
  const rtp = params.rtp ? `${params.rtp}%` : "\u2014";
  const volatility = (params.volatility as string) ?? "\u2014";

  return {
    id: game.id,
    name: game.name,
    type: game.game_type,
    team: "\u2014",
    status: mapLibraryStatus(game.status),
    rtp,
    volatility,
    devStartMonth,
    devEndMonth,
    techReleaseMonth,
    marketingReleaseMonth,
    techDate,
    marketingDate,
    wizardStep: "\u2014",
    source: "library",
    year: release ? release.getFullYear() : created.getFullYear(),
  };
}

/**
 * Convert a Project to a RoadmapGame.
 * Timeline is estimated from created_at / updated_at and wizard progress.
 */
export function projectToRoadmap(project: Project): RoadmapGame {
  const created = new Date(project.created_at);
  const updated = new Date(project.updated_at);
  const currentStep = project.current_step ?? 0;
  const completedSteps = project.completed_steps ?? 0;
  const totalSteps = TOTAL_WIZARD_STEPS;

  const devStartMonth = created.getMonth() + (created.getDate() / 30);

  // Estimate timeline from wizard progress
  const progress = completedSteps / totalSteps; // 0 to 1
  const estimatedDevMonths = 3; // assume 3 months dev cycle
  const devEndMonth = Math.min(12, devStartMonth + estimatedDevMonths);
  const techReleaseMonth = devEndMonth;
  const marketingReleaseMonth = Math.min(12, devEndMonth + 0.5);

  const techD = new Date(created);
  techD.setMonth(techD.getMonth() + estimatedDevMonths);
  const techDate = formatMonthDay(techD);
  const mktD = new Date(techD);
  mktD.setDate(mktD.getDate() + 15);
  const marketingDate = formatMonthDay(mktD);

  // Extract RTP from step_data if available
  const stepData = project.step_data ?? {};
  const step2 = stepData.step2 as Record<string, unknown> | undefined;
  const rtp = step2?.target_rtp ? `${step2.target_rtp}%` : "\u2014";
  const volatility = (step2?.volatility as string) ?? "\u2014";

  return {
    id: project.id,
    name: project.name,
    type: project.game_type,
    team: "\u2014",
    status: mapProjectStatus(project.status, completedSteps, totalSteps),
    rtp,
    volatility,
    devStartMonth,
    devEndMonth,
    techReleaseMonth,
    marketingReleaseMonth,
    techDate,
    marketingDate,
    wizardStep: `${completedSteps}/${totalSteps}`,
    source: "project",
    year: techD.getFullYear(),
  };
}

/**
 * Merge library games and projects into a unified roadmap list.
 * Projects linked to library games (via project_id) are deduplicated — project wins.
 */
export function mergeToRoadmap(
  libraryGames: LibraryGame[],
  projects: Project[],
): RoadmapGame[] {
  const result: RoadmapGame[] = [];
  const projectIds = new Set(projects.map((p) => p.id));
  const linkedProjectIds = new Set<string>();

  // First pass: identify library games linked to projects — use library data for timeline/status
  for (const game of libraryGames) {
    if (game.project_id && projectIds.has(game.project_id)) {
      linkedProjectIds.add(game.project_id);
      // Use library game data (has release_date, status from external source) merged with project progress
      const project = projects.find((p) => p.id === game.project_id);
      const roadmapGame = libraryGameToRoadmap(game);
      if (project) {
        const completedSteps = project.completed_steps ?? 0;
        roadmapGame.wizardStep = `${completedSteps}/${TOTAL_WIZARD_STEPS}`;
      }
      result.push(roadmapGame);
    }
  }

  // Add projects that are NOT linked to a library game
  for (const project of projects) {
    if (linkedProjectIds.has(project.id)) continue;
    result.push(projectToRoadmap(project));
  }

  // Add library games that are NOT linked to any project
  for (const game of libraryGames) {
    if (game.project_id && projectIds.has(game.project_id)) continue;
    result.push(libraryGameToRoadmap(game));
  }

  // Sort by devStartMonth
  result.sort((a, b) => a.devStartMonth - b.devStartMonth);

  return result;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const QUARTERS: Record<number, string> = { 0: "Q1", 3: "Q2", 6: "Q3", 9: "Q4" };

export function getQuarter(month: number): string {
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

export const TYPE_CONFIG: Record<GameType, { label: string; iconLetter: string; gradient: string; badgeBg: string; badgeColor: string }> = {
  slot: { label: "Slot", iconLetter: "S", gradient: "linear-gradient(135deg, #7c6bf5, #a78bfa)", badgeBg: "var(--accent-soft)", badgeColor: "var(--accent)" },
  crash: { label: "Crash", iconLetter: "C", gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", badgeBg: "var(--amber-soft)", badgeColor: "var(--amber)" },
  table: { label: "Table", iconLetter: "T", gradient: "linear-gradient(135deg, #10b981, #06b6d4)", badgeBg: "var(--teal-soft)", badgeColor: "var(--teal)" },
};

export const STATUS_CONFIG: Record<GameStatus, { label: string; bg: string; color: string }> = {
  released: { label: "Released", bg: "var(--green-soft)", color: "var(--green)" },
  dev: { label: "In development", bg: "var(--accent-soft)", color: "var(--accent)" },
  concept: { label: "Concept", bg: "var(--bg4)", color: "var(--text3)" },
  qa: { label: "QA", bg: "var(--amber-soft)", color: "var(--amber)" },
  delayed: { label: "Delayed", bg: "var(--red-soft)", color: "var(--red)" },
};

export const TEAM_CONFIG: Record<string, { bg: string; color: string }> = {
  Alpha: { bg: "var(--blue-soft)", color: "var(--blue)" },
  Beta: { bg: "var(--pink-soft)", color: "var(--pink)" },
  Gamma: { bg: "var(--green-soft)", color: "var(--green)" },
};

export const SAMPLE_ROADMAP_GAMES: RoadmapGame[] = [
  { name: "Tempest of Quetzalcoatl", type: "slot", team: "Alpha", status: "released", rtp: "96.0%", volatility: "Med-high", devStartMonth: 0, devEndMonth: 2, techReleaseMonth: 2, marketingReleaseMonth: 2.5, techDate: "Feb 15", marketingDate: "Mar 1", wizardStep: "9/9", source: "sample", year: 2026 },
  { name: "Love & Luck Joker", type: "slot", team: "Beta", status: "released", rtp: "96.0%", volatility: "High", devStartMonth: 0.5, devEndMonth: 2.5, techReleaseMonth: 2.5, marketingReleaseMonth: 3, techDate: "Mar 1", marketingDate: "Mar 16", wizardStep: "9/9", source: "sample", year: 2026 },
  { name: "Neon Samurai X", type: "slot", team: "Alpha", status: "released", rtp: "96.5%", volatility: "High", devStartMonth: 1, devEndMonth: 3.2, techReleaseMonth: 3, marketingReleaseMonth: 3.5, techDate: "Mar 20", marketingDate: "Apr 5", wizardStep: "9/9", source: "sample", year: 2026 },
  { name: "Rocket Blitz", type: "crash", team: "Gamma", status: "dev", rtp: "97.0%", volatility: "\u2014", devStartMonth: 2, devEndMonth: 4.5, techReleaseMonth: 4.5, marketingReleaseMonth: 5, techDate: "May 1", marketingDate: "May 15", wizardStep: "5/9", source: "sample", year: 2026 },
  { name: "Dragon Palace Megaways", type: "slot", team: "Beta", status: "dev", rtp: "96.2%", volatility: "Ultra", devStartMonth: 2.5, devEndMonth: 5.5, techReleaseMonth: 5.5, marketingReleaseMonth: 6, techDate: "Jun 1", marketingDate: "Jun 15", wizardStep: "4/9", source: "sample", year: 2026 },
  { name: "Lightning Blackjack Pro", type: "table", team: "Gamma", status: "dev", rtp: "99.1%", volatility: "Low", devStartMonth: 3, devEndMonth: 5, techReleaseMonth: 5, marketingReleaseMonth: 5.5, techDate: "May 15", marketingDate: "Jun 1", wizardStep: "3/9", source: "sample", year: 2026 },
  { name: "Crash Royale", type: "crash", team: "Gamma", status: "dev", rtp: "97.0%", volatility: "\u2014", devStartMonth: 4, devEndMonth: 6.5, techReleaseMonth: 6.5, marketingReleaseMonth: 7, techDate: "Jul 1", marketingDate: "Jul 15", wizardStep: "2/9", source: "sample", year: 2026 },
  { name: "Aztec Gold Rush", type: "slot", team: "Alpha", status: "dev", rtp: "95.5%", volatility: "Med", devStartMonth: 3.5, devEndMonth: 6, techReleaseMonth: 6, marketingReleaseMonth: 6.5, techDate: "Jun 15", marketingDate: "Jul 1", wizardStep: "3/9", source: "sample", year: 2026 },
  { name: "Fortune Tiger 88", type: "slot", team: "Beta", status: "dev", rtp: "96.0%", volatility: "Med-high", devStartMonth: 5, devEndMonth: 7.5, techReleaseMonth: 7.5, marketingReleaseMonth: 8, techDate: "Aug 1", marketingDate: "Aug 15", wizardStep: "1/9", source: "sample", year: 2026 },
  { name: "European Roulette VIP", type: "table", team: "Gamma", status: "concept", rtp: "97.3%", volatility: "Low", devStartMonth: 7, devEndMonth: 9, techReleaseMonth: 9, marketingReleaseMonth: 9.5, techDate: "Oct 1", marketingDate: "Oct 15", wizardStep: "0/9", source: "sample", year: 2026 },
  { name: "Candy Cascade", type: "slot", team: "Alpha", status: "concept", rtp: "96.0%", volatility: "Med", devStartMonth: 7, devEndMonth: 9.5, techReleaseMonth: 9.5, marketingReleaseMonth: 10, techDate: "Oct 15", marketingDate: "Nov 1", wizardStep: "0/9", source: "sample", year: 2026 },
  { name: "Turbo Crash Pro", type: "crash", team: "Gamma", status: "concept", rtp: "96.0%", volatility: "\u2014", devStartMonth: 8, devEndMonth: 10, techReleaseMonth: 10, marketingReleaseMonth: 10.5, techDate: "Nov 1", marketingDate: "Nov 15", wizardStep: "0/9", source: "sample", year: 2026 },
  { name: "Wild West Heist", type: "slot", team: "Beta", status: "concept", rtp: "96.5%", volatility: "High", devStartMonth: 9, devEndMonth: 11.5, techReleaseMonth: 11.5, marketingReleaseMonth: 12, techDate: "Dec 1", marketingDate: "Dec 15", wizardStep: "0/9", source: "sample", year: 2026 },
  { name: "Mystic Gems Cluster", type: "slot", team: "Alpha", status: "concept", rtp: "96.0%", volatility: "Med-high", devStartMonth: 10, devEndMonth: 12, techReleaseMonth: 12, marketingReleaseMonth: 12.5, techDate: "Dec 28", marketingDate: "Jan 10, 2027", wizardStep: "0/9", source: "sample", year: 2026 },
];
