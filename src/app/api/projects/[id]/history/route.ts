import { NextRequest, NextResponse } from "next/server";
import { projectsStore } from "../../../_data/projects";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = projectsStore.get(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Return sample history entries
  return NextResponse.json([
    { id: "h-1", action: "created", changes: "Project created", timestamp: project.created_at },
    { id: "h-2", action: "updated", changes: "Step 1 completed", timestamp: project.updated_at },
  ]);
}
