import { NextRequest, NextResponse } from "next/server";
import { projectsStore } from "../_data/projects";

export async function GET() {
  return NextResponse.json(projectsStore.list());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = projectsStore.create(body);
  return NextResponse.json(project, { status: 201 });
}
