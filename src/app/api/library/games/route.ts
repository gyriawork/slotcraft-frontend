import { NextRequest, NextResponse } from "next/server";

/**
 * Library games API — full dataset matching TASK_game_library_implement.md spec.
 * All 14 games with brand, features, ai score, hitFreq, maxWin, createdBy, team.
 */

const SAMPLE_GAMES = [
  {
    id: "lib-001",
    name: "Tempest of Quetzalcoatl",
    game_type: "slot" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 96.0, volatility: "med-high", reels: 5, rows: 3, paylines: 20,
      max_win: 4875, hit_frequency: 27.6, theme: "Aztec Mythology",
      brand: "Evoplay", features: ["Wild", "Cascade", "Accum", "FS", "Scatter"],
      ai_score: 8.1, created_by: "Alex K.", team: "Alpha",
      min_bet: 0.20, max_bet: 100,
    },
    ai_analysis: { overall: 8.1 },
    ai_analyzed_at: "2026-02-20T10:00:00Z",
    status: "live" as const,
    release_date: "2026-03-01",
    project_id: "proj-001",
    created_at: "2025-11-15T10:00:00Z",
    updated_at: "2026-03-01T14:30:00Z",
  },
  {
    id: "lib-002",
    name: "Love & Luck Joker",
    game_type: "slot" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 96.0, volatility: "high", reels: 5, rows: 3, paylines: 10,
      max_win: 3537, hit_frequency: 31, theme: "Romance",
      brand: "Evoplay", features: ["Wild", "FS", "Multiplier", "Respin"],
      ai_score: 7.2, created_by: "Maria S.", team: "Beta",
      min_bet: 0.10, max_bet: 50,
    },
    ai_analysis: { overall: 7.2 },
    ai_analyzed_at: "2026-02-22T10:00:00Z",
    status: "live" as const,
    release_date: "2026-03-16",
    project_id: "proj-002",
    created_at: "2025-12-01T09:00:00Z",
    updated_at: "2026-03-16T11:00:00Z",
  },
  {
    id: "lib-003",
    name: "Neon Samurai X",
    game_type: "slot" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 96.5, volatility: "high", reels: 6, rows: 4, paylines: 50,
      max_win: 5200, hit_frequency: 24, theme: "Cyberpunk",
      brand: "Evoplay", features: ["Wild", "Cascade", "FS", "Multiplier"],
      ai_score: 7.8, created_by: "Alex K.", team: "Alpha",
      min_bet: 0.20, max_bet: 200,
    },
    ai_analysis: { overall: 7.8 },
    ai_analyzed_at: "2026-03-01T10:00:00Z",
    status: "live" as const,
    release_date: "2026-04-05",
    project_id: "proj-003",
    created_at: "2025-12-10T08:00:00Z",
    updated_at: "2026-04-05T16:00:00Z",
  },
  {
    id: "lib-004",
    name: "Rocket Blitz",
    game_type: "crash" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 97.0, theme: "Space",
      brand: "Slotopia", features: ["Auto Cashout", "Multiplier"],
      ai_score: 6.5, created_by: "Denis R.", team: "Gamma",
    },
    ai_analysis: { overall: 6.5 },
    ai_analyzed_at: "2026-03-05T10:00:00Z",
    status: "development" as const,
    release_date: null,
    project_id: "proj-004",
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-005",
    name: "Dragon Palace Megaways",
    game_type: "slot" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 96.2, volatility: "ultra", reels: 6, rows: 7, paylines: 117649,
      max_win: 15000, hit_frequency: 18, theme: "Chinese",
      brand: "Evoplay", features: ["Megaways", "FS", "Cascade", "Multiplier", "Wild"],
      ai_score: 8.5, created_by: "Maria S.", team: "Beta",
      min_bet: 0.20, max_bet: 100,
    },
    ai_analysis: { overall: 8.5 },
    ai_analyzed_at: "2026-03-10T10:00:00Z",
    status: "development" as const,
    release_date: null,
    project_id: "proj-005",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-006",
    name: "Lightning Blackjack Pro",
    game_type: "table" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 99.1, volatility: "low", max_win: 500, hit_frequency: 42, theme: "Casino",
      brand: "Slotopia", features: ["Lightning Round", "Side Bet", "Multiplier"],
      ai_score: 7.0, created_by: "Denis R.", team: "Gamma",
    },
    ai_analysis: { overall: 7.0 },
    ai_analyzed_at: "2026-03-08T10:00:00Z",
    status: "development" as const,
    release_date: null,
    project_id: "proj-006",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-007",
    name: "Crash Royale",
    game_type: "crash" as const,
    source: "manual" as const,
    parameters: {
      rtp: 97.0, theme: "Royal Palace",
      brand: "Slotopia", features: ["Auto Cashout", "Multiplier", "Social"],
      ai_score: 5.8, created_by: "Denis R.", team: "Gamma",
    },
    ai_analysis: { overall: 5.8 },
    ai_analyzed_at: "2026-03-12T10:00:00Z",
    status: "development" as const,
    release_date: null,
    project_id: null,
    created_at: "2026-02-10T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-008",
    name: "Aztec Gold Rush",
    game_type: "slot" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 95.5, volatility: "med", reels: 5, rows: 3, paylines: 25,
      max_win: 2500, hit_frequency: 32, theme: "Aztec Gold",
      brand: "Evoplay", features: ["Wild", "FS", "Scatter"],
      ai_score: 5.2, created_by: "Alex K.", team: "Alpha",
      min_bet: 0.10, max_bet: 50,
    },
    ai_analysis: { overall: 5.2 },
    ai_analyzed_at: "2026-03-14T10:00:00Z",
    status: "development" as const,
    release_date: null,
    project_id: "proj-007",
    created_at: "2026-02-15T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-009",
    name: "Fortune Tiger 88",
    game_type: "slot" as const,
    source: "wizard" as const,
    parameters: {
      rtp: 96.0, volatility: "med-high", reels: 5, rows: 3, paylines: 88,
      max_win: 3000, hit_frequency: 28, theme: "Chinese",
      brand: "Evoplay", features: ["Wild", "FS", "Respin", "Multiplier"],
      ai_score: 6.8, created_by: "Maria S.", team: "Beta",
      min_bet: 0.88, max_bet: 88,
    },
    ai_analysis: { overall: 6.8 },
    ai_analyzed_at: "2026-03-15T10:00:00Z",
    status: "development" as const,
    release_date: null,
    project_id: "proj-008",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-010",
    name: "European Roulette VIP",
    game_type: "table" as const,
    source: "manual" as const,
    parameters: {
      rtp: 97.3, volatility: "low", max_win: 35, hit_frequency: 48, theme: "Casino",
      brand: "Slotopia", features: ["Side Bet", "VIP Mode"],
      created_by: "Denis R.", team: "Gamma",
    },
    ai_analysis: null,
    ai_analyzed_at: null,
    status: "concept" as const,
    release_date: null,
    project_id: null,
    created_at: "2026-03-05T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-011",
    name: "Candy Cascade",
    game_type: "slot" as const,
    source: "manual" as const,
    parameters: {
      rtp: 96.0, volatility: "med", reels: 6, rows: 6, paylines: 0,
      max_win: 8000, theme: "Candy",
      brand: "Evoplay", features: ["Cascade", "Multiplier", "FS", "Cluster"],
      created_by: "Alex K.", team: "Alpha",
    },
    ai_analysis: null,
    ai_analyzed_at: null,
    status: "concept" as const,
    release_date: null,
    project_id: null,
    created_at: "2026-03-06T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-012",
    name: "Turbo Crash Pro",
    game_type: "crash" as const,
    source: "manual" as const,
    parameters: {
      rtp: 96.0, theme: "Racing",
      brand: "Slotopia", features: ["Auto Cashout", "Turbo Mode", "Multiplier"],
      max_win: 50000,
      created_by: "Denis R.", team: "Gamma",
    },
    ai_analysis: null,
    ai_analyzed_at: null,
    status: "concept" as const,
    release_date: null,
    project_id: null,
    created_at: "2026-03-07T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-013",
    name: "Wild West Heist",
    game_type: "slot" as const,
    source: "manual" as const,
    parameters: {
      rtp: 96.5, volatility: "high", reels: 5, rows: 3, paylines: 30,
      max_win: 10000, theme: "Wild West",
      brand: "Evoplay", features: ["Wild", "FS", "Scatter", "Multiplier", "Bonus Buy"],
      created_by: "Maria S.", team: "Beta",
    },
    ai_analysis: null,
    ai_analyzed_at: null,
    status: "concept" as const,
    release_date: null,
    project_id: null,
    created_at: "2026-03-08T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
  {
    id: "lib-014",
    name: "Mystic Gems Cluster",
    game_type: "slot" as const,
    source: "manual" as const,
    parameters: {
      rtp: 96.0, volatility: "med-high", reels: 7, rows: 7, paylines: 0,
      max_win: 6500, theme: "Gemstone",
      brand: "Slotopia", features: ["Cluster", "Cascade", "FS", "Wild"],
      created_by: "Alex K.", team: "Alpha",
    },
    ai_analysis: null,
    ai_analyzed_at: null,
    status: "concept" as const,
    release_date: null,
    project_id: null,
    created_at: "2026-03-09T10:00:00Z",
    updated_at: "2026-03-17T09:00:00Z",
  },
];

// In-memory store
let games = [...SAMPLE_GAMES];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  let filtered = [...games];
  if (type) filtered = filtered.filter((g) => g.game_type === type);
  if (status) filtered = filtered.filter((g) => g.status === status);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        ((g.parameters.theme as string) ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const newGame = {
    id: `lib-${Date.now()}`,
    name: body.name || "Untitled Game",
    game_type: body.game_type || "slot",
    source: "manual" as const,
    parameters: body.parameters || {},
    ai_analysis: null,
    ai_analyzed_at: null,
    status: body.status || "concept",
    release_date: body.release_date || null,
    project_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  games = [newGame, ...games];
  return NextResponse.json(newGame, { status: 201 });
}
