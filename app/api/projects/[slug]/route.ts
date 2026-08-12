import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjectBySlug, renameProject } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const project = await getProjectBySlug(params.slug);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memuat project." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const project = await getProjectBySlug(params.slug);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Nama project wajib diisi." }, { status: 400 });
    }

    const updated = await renameProject(project.id, name);
    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengubah nama project." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const project = await getProjectBySlug(params.slug);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }

    await deleteProject(project.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus project." }, { status: 500 });
  }
}
