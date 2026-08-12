import { NextRequest, NextResponse } from "next/server";
import { deleteTask, isValidStatus, updateTaskProgress, updateTaskStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID tugas tidak valid." }, { status: 400 });
    }

    const body = await request.json();
    let task;

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
      }
      task = await updateTaskStatus(id, body.status);
    } else if (body.progress !== undefined) {
      const progress = Number(body.progress);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        return NextResponse.json({ error: "Progres harus berupa angka 0-100." }, { status: 400 });
      }
      task = await updateTaskProgress(id, progress);
    } else {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    if (!task) {
      return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memperbarui tugas." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID tugas tidak valid." }, { status: 400 });
    }

    const deleted = await deleteTask(id);
    if (!deleted) {
      return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus tugas." }, { status: 500 });
  }
}
