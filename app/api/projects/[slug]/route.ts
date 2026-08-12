import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug } from "@/lib/db";

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
