import { NextRequest, NextResponse } from "next/server";
import { createTask, getProjectBySlug, isValidStatus, listTasks } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("project");
    if (!slug) {
      return NextResponse.json({ error: "Parameter project wajib diisi." }, { status: 400 });
    }

    const project = await getProjectBySlug(slug);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }

    const tasks = await listTasks(project.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memuat data tugas." }, { status: 500 });
  }
}

const DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDeadline(value: unknown): { ok: true; deadline: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, deadline: null };
  }
  if (typeof value === "string" && DEADLINE_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime())) {
    return { ok: true, deadline: value };
  }
  return { ok: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectSlug = typeof body.project === "string" ? body.project : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const assignee = typeof body.assignee === "string" ? body.assignee.trim() : "";
    const status = isValidStatus(body.status) ? body.status : "belum_mulai";
    const deadlineResult = parseDeadline(body.deadline);

    if (!projectSlug) {
      return NextResponse.json({ error: "Project tidak valid." }, { status: 400 });
    }
    if (!title || !assignee) {
      return NextResponse.json(
        { error: "Nama tugas dan nama penanggung jawab wajib diisi." },
        { status: 400 }
      );
    }
    if (!deadlineResult.ok) {
      return NextResponse.json({ error: "Format deadline tidak valid." }, { status: 400 });
    }

    const project = await getProjectBySlug(projectSlug);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }

    const task = await createTask(project.id, title, assignee, status, deadlineResult.deadline);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menambah tugas." }, { status: 500 });
  }
}
