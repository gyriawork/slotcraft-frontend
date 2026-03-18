import { NextResponse } from "next/server";
import { projectsStore } from "../_data/projects";

/**
 * GET /api/dashboard
 *
 * Returns a pre-computed dashboard snapshot.
 * All derived metrics are computed here so the client
 * only does presentation logic.
 */

function daysBetween(a: string | Date, b: string | Date): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function minutesSince(d: string): number {
  return Math.round((Date.now() - new Date(d).getTime()) / 60_000);
}

// Enrichment data per project (brand, team, created_by, sim, marketing)
const ENRICHMENT: Record<string, {
  brand: string; team: string; created_by: string;
  sim_status: "passed" | "failed" | "running" | "not_run";
  verified_rtp: number | null; sim_started_at?: string;
  icons_uploaded: number; icons_total: number;
  product_sheet_status: "ready" | "draft" | "missing";
  stale_steps: number[];
}> = {
  "proj-001": {
    brand: "Evoplay", team: "Alpha", created_by: "Alex K.",
    sim_status: "passed", verified_rtp: 95.97,
    icons_uploaded: 6, icons_total: 6,
    product_sheet_status: "ready", stale_steps: [],
  },
  "proj-002": {
    brand: "Evoplay", team: "Beta", created_by: "Maria S.",
    sim_status: "passed", verified_rtp: 96.01,
    icons_uploaded: 4, icons_total: 6,
    product_sheet_status: "draft", stale_steps: [],
  },
  "proj-003": {
    brand: "Evoplay", team: "Alpha", created_by: "Alex K.",
    sim_status: "passed", verified_rtp: 96.48,
    icons_uploaded: 0, icons_total: 6,
    product_sheet_status: "missing", stale_steps: [],
  },
  "proj-004": {
    brand: "Slotopia", team: "Gamma", created_by: "Denis R.",
    sim_status: "failed", verified_rtp: 97.42,
    icons_uploaded: 0, icons_total: 4,
    product_sheet_status: "missing", stale_steps: [],
  },
  "proj-005": {
    brand: "Evoplay", team: "Beta", created_by: "Maria S.",
    sim_status: "not_run", verified_rtp: null,
    icons_uploaded: 0, icons_total: 6,
    product_sheet_status: "missing", stale_steps: [],
  },
  "proj-006": {
    brand: "Slotopia", team: "Gamma", created_by: "Denis R.",
    sim_status: "not_run", verified_rtp: null,
    icons_uploaded: 0, icons_total: 4,
    product_sheet_status: "missing", stale_steps: [],
  },
  "proj-007": {
    brand: "Evoplay", team: "Alpha", created_by: "Alex K.",
    sim_status: "not_run", verified_rtp: null,
    icons_uploaded: 0, icons_total: 6,
    product_sheet_status: "missing", stale_steps: [3],
  },
  "proj-008": {
    brand: "Evoplay", team: "Beta", created_by: "Maria S.",
    sim_status: "not_run", verified_rtp: null,
    icons_uploaded: 0, icons_total: 6,
    product_sheet_status: "missing", stale_steps: [],
  },
};

const TOTAL_STEPS = 9;

export async function GET() {
  const rawProjects = projectsStore.list();
  const now = new Date();

  const projects = rawProjects
    .filter((p) => p.status !== "archived")
    .map((p) => {
      const enrich = ENRICHMENT[p.id] ?? {
        brand: "—", team: "—", created_by: "—",
        sim_status: "not_run" as const, verified_rtp: null,
        icons_uploaded: 0, icons_total: 6,
        product_sheet_status: "missing" as const, stale_steps: [],
      };

      const step2 = p.step_data?.step2 as { target_rtp?: number; volatility?: string } | undefined;

      // Derive status per DASHBOARD_BINDING.md
      let status: "active" | "complete" | "draft" | "blocked" = p.status === "draft" ? "draft" : "active";
      if (enrich.sim_status === "failed") status = "blocked";
      if (p.current_step >= TOTAL_STEPS && enrich.sim_status === "passed") status = "complete";
      if (p.current_step < 2 && p.status === "draft") status = "draft";

      const releaseDate = p.marketing_release ?? p.tech_release ?? null;
      const daysUntilRelease = releaseDate ? daysBetween(now, releaseDate) : null;
      const daysSinceUpdate = daysBetween(p.updated_at, now.toISOString());

      // Next action
      let nextAction = `Continue Step ${p.current_step}`;
      if (status === "complete") nextAction = "Released";
      else if (status === "blocked") nextAction = "Fix simulation failure";
      else if (enrich.sim_status === "passed" && p.current_step < TOTAL_STEPS) nextAction = `Continue Step ${p.current_step + 1}`;

      return {
        id: p.id,
        name: p.name,
        game_type: p.game_type,
        brand: enrich.brand,
        team: enrich.team,
        created_by: enrich.created_by,
        current_step: p.current_step,
        total_steps: TOTAL_STEPS,
        status,
        target_rtp: step2?.target_rtp ?? null,
        volatility: step2?.volatility ?? null,
        sim_status: enrich.sim_status,
        verified_rtp: enrich.verified_rtp,
        sim_started_at: enrich.sim_status === "running" ? (ENRICHMENT[p.id] as Record<string, unknown>)?.sim_started_at as string ?? null : null,
        icons_uploaded: enrich.icons_uploaded,
        icons_total: enrich.icons_total,
        product_sheet_status: enrich.product_sheet_status,
        target_release_date: releaseDate,
        last_updated_at: p.updated_at,
        last_updated_by: enrich.created_by,
        created_at: p.created_at,
        completed_at: status === "complete" ? p.updated_at : null,
        next_action: nextAction,
        days_until_release: daysUntilRelease,
        days_since_last_update: daysSinceUpdate,
        stale_steps: enrich.stale_steps,
      };
    });

  // Recent activity (synthetic for demo)
  const recentActivity = [
    { id: "act-1", project_id: "proj-001", project_name: "Tempest of Quetzalcoatl", user_name: "Alex K.", action: "sim_completed", detail: "RTP 95.97% (passed)", created_at: "2026-03-17T14:30:00Z" },
    { id: "act-2", project_id: "proj-004", project_name: "Rocket Blitz", user_name: "Denis R.", action: "sim_failed", detail: "RTP 97.42% vs target 97.0%", created_at: "2026-03-17T12:15:00Z" },
    { id: "act-3", project_id: "proj-002", project_name: "Love & Luck Joker", user_name: "Maria S.", action: "asset_uploaded", detail: "4 marketing icons", created_at: "2026-03-17T11:00:00Z" },
    { id: "act-4", project_id: "proj-003", project_name: "Neon Samurai X", user_name: "Alex K.", action: "step_completed", detail: "Step 7 completed", created_at: "2026-03-16T16:00:00Z" },
    { id: "act-5", project_id: "proj-005", project_name: "Dragon Palace Megaways", user_name: "Maria S.", action: "step_completed", detail: "Step 4 completed", created_at: "2026-03-16T14:00:00Z" },
    { id: "act-6", project_id: "proj-001", project_name: "Tempest of Quetzalcoatl", user_name: "Alex K.", action: "export_generated", detail: "GDD v3 exported", created_at: "2026-03-16T10:00:00Z" },
    { id: "act-7", project_id: "proj-006", project_name: "Lightning Blackjack Pro", user_name: "Denis R.", action: "step_completed", detail: "Step 3 completed", created_at: "2026-03-15T15:00:00Z" },
    { id: "act-8", project_id: "proj-002", project_name: "Love & Luck Joker", user_name: "Maria S.", action: "sim_completed", detail: "RTP 96.01% (passed)", created_at: "2026-03-15T09:30:00Z" },
  ];

  return NextResponse.json({ projects, recentActivity });
}
