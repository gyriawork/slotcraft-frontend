import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows || [];

  const errors: Array<{ row: number; reason: string }> = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name?.trim()) {
      errors.push({ row: i + 1, reason: "Missing name" });
      continue;
    }
    if (!row.game_type || !["slot", "crash", "table"].includes(row.game_type)) {
      errors.push({ row: i + 1, reason: "Invalid game_type" });
      continue;
    }
    imported++;
  }

  return NextResponse.json({ imported, errors, total: rows.length });
}
