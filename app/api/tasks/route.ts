import { NextRequest, NextResponse } from "next/server";
import { createTask, isValidStatus, listTasks } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tasks = await listTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memuat data tugas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const assignee = typeof body.assignee === "string" ? body.assignee.trim() : "";
    const status = isValidStatus(body.status) ? body.status : "belum_mulai";

    if (!title || !assignee) {
      return NextResponse.json(
        { error: "Nama tugas dan nama penanggung jawab wajib diisi." },
        { status: 400 }
      );
    }

    const task = await createTask(title, assignee, status);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menambah tugas." }, { status: 500 });
  }
}
