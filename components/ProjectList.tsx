"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/db";

export default function ProjectList() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const list: Project[] = data.projects ?? [];

        // Kalau cuma ada 1 project, langsung masuk ke papannya —
        // supaya tim yang belum butuh multi-project tidak kena langkah tambahan.
        if (list.length === 1) {
          setRedirecting(true);
          router.replace(`/${list[0].slug}`);
          return;
        }

        setProjects(list);
        setError(null);
      } catch {
        setError("Tidak bisa memuat daftar project.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Nama project wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal membuat project.");
      router.push(`/${data.project.slug}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat project.");
      setSubmitting(false);
    }
  }

  if (redirecting) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <p className="text-gray-500">Membuka papan...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📋 Papan Koordinasi Tim</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pilih project/tim yang mau dilihat, atau buat papan baru untuk project lain.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-7 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Buat Project Baru</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Nama Project/Tim</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Tim Marketing"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Membuat..." : "+ Buat Project"}
          </button>
        </form>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </section>

      <h2 className="mb-3 text-base font-semibold text-gray-900">Daftar Project</h2>
      {loading ? (
        <p className="text-gray-500">Memuat daftar project...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-gray-500">
          Belum ada project. Buat project pertama Anda di atas.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/${project.slug}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm hover:border-indigo-400 hover:shadow"
            >
              <span className="font-semibold text-gray-900">{project.name}</span>
              <span className="text-sm text-gray-400">Buka →</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
