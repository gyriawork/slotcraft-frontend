import { NextResponse } from "next/server";

/**
 * Library analytics — computed from the games list API, not hardcoded.
 * Fetches games from the same in-memory store and derives all stats.
 */
export async function GET(req: Request) {
  const gamesModule = await import("../games/route");
  const gamesReq = new Request(new URL("/api/library/games", req.url));
  const gamesRes = await gamesModule.GET(gamesReq as never);
  const games = await gamesRes.json() as Array<{
    game_type: string;
    status: string;
    parameters: Record<string, unknown>;
  }>;

  const total_games = games.length;

  // Compute avg RTP and range
  const rtps = games
    .map((g) => g.parameters?.rtp as number | undefined)
    .filter((r): r is number => r !== undefined && r !== null);
  const avg_rtp = rtps.length > 0
    ? Math.round((rtps.reduce((a, b) => a + b, 0) / rtps.length) * 10) / 10
    : 0;
  const rtp_range = rtps.length > 0
    ? { min: Math.min(...rtps), max: Math.max(...rtps) }
    : { min: 0, max: 0 };

  // Volatility distribution
  const volatility_distribution: Record<string, number> = {};
  for (const g of games) {
    const vol = g.parameters?.volatility as string | undefined;
    if (vol) volatility_distribution[vol] = (volatility_distribution[vol] ?? 0) + 1;
  }

  // Theme distribution
  const theme_distribution: Record<string, number> = {};
  for (const g of games) {
    const theme = g.parameters?.theme as string | undefined;
    if (theme) theme_distribution[theme] = (theme_distribution[theme] ?? 0) + 1;
  }

  // Feature popularity — computed from games parameters.features array
  const feature_popularity: Record<string, number> = {};
  for (const g of games) {
    const features = g.parameters?.features as string[] | undefined;
    if (features) {
      for (const f of features) {
        feature_popularity[f] = (feature_popularity[f] ?? 0) + 1;
      }
    }
  }

  // Type distribution
  const type_distribution: Record<string, number> = {};
  for (const g of games) {
    type_distribution[g.game_type] = (type_distribution[g.game_type] ?? 0) + 1;
  }

  // Status distribution
  const status_distribution: Record<string, number> = {};
  for (const g of games) {
    status_distribution[g.status] = (status_distribution[g.status] ?? 0) + 1;
  }

  return NextResponse.json({
    total_games,
    avg_rtp,
    rtp_range,
    volatility_distribution,
    theme_distribution,
    feature_popularity,
    type_distribution,
    status_distribution,
  });
}
