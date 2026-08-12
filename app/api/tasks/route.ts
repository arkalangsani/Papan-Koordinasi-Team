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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectSlug = typeof body.project === "string" ? body.project : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const assignee = typeof body.assignee === "string" ? body.assignee.trim() : "";
    const status = isValidStatus(body.status) ? body.status : "belum_mulai";

    if (!projectSlug) {
      return NextResponse.json({ error: "Project tidak valid." }, { status: 400 });
    }
    if (!title || !assignee) {
      return NextResponse.json(
        { error: "Nama tugas dan nama penanggung jawab wajib diisi." },
        { status: 400 }
      );
    }

    const project = await getProjectBySlug(projectSlug);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }

    const task = await createTask(project.id, title, assignee, status);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menambah tugas." }, { status: 500 });
  }
}
