import { NextRequest, NextResponse } from "next/server";
import { projectsStore } from "../../../_data/projects";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const copy = projectsStore.duplicate(id);
  if (!copy) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(copy, { status: 201 });
}
