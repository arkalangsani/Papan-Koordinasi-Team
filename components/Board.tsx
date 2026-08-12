"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/db";
import { STATUS_LABELS, STATUS_VALUES, TaskStatus } from "@/lib/constants";

const POLL_INTERVAL_MS = 5000;

const COLUMN_STYLES: Record<TaskStatus, string> = {
  belum_mulai: "text-gray-600",
  dikerjakan: "text-amber-700",
  selesai: "text-green-700",
};

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [initialStatus, setInitialStatus] = useState<TaskStatus>("belum_mulai");

  async function fetchTasks(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setError(null);
    } catch {
      setError("Tidak bisa memuat data tugas. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks(true);
    const interval = setInterval(() => fetchTasks(false), POLL_INTERVAL_MS);
    const onFocus = () => fetchTasks(false);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const columns = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(STATUS_VALUES.map((s) => [s, []]));
    for (const task of tasks) {
      map.get(task.status)?.push(task);
    }
    return map;
  }, [tasks]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedAssignee = assignee.trim();
    if (!trimmedTitle || !trimmedAssignee) {
      setFormError("Nama tugas dan nama penanggung jawab wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, assignee: trimmedAssignee, status: initialStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menambah tugas.");
      }
      setTitle("");
      setAssignee("");
      setInitialStatus("belum_mulai");
      await fetchTasks(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambah tugas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchTasks(false);
    } catch {
      setError("Gagal mengubah status. Silakan coba lagi.");
      fetchTasks(false);
    }
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setError("Gagal menghapus tugas. Silakan coba lagi.");
      fetchTasks(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📋 Papan Koordinasi Tim</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lihat siapa mengerjakan apa, tanpa scroll chat WhatsApp — data yang sama untuk semua orang.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-7 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Tambah Tugas Baru</h2>
        <form onSubmit={handleAddTask} className="grid gap-3 sm:grid-cols-[2fr_1.5fr_1.2fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Nama Tugas</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Desain banner promo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Penanggung Jawab</span>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Contoh: Dina"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Status Awal</span>
            <select
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as TaskStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "+ Tambah Tugas"}
          </button>
        </form>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </section>

      {loading ? (
        <p className="text-gray-500">Memuat data tugas...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {STATUS_VALUES.map((status) => {
            const columnTasks = columns.get(status) ?? [];
            return (
              <div key={status} className="rounded-xl border border-gray-200 bg-white p-3.5">
                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className={`text-sm font-bold ${COLUMN_STYLES[status]}`}>{STATUS_LABELS[status]}</h3>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500">
                    {columnTasks.length}
                  </span>
                </div>
                {columnTasks.length === 0 ? (
                  <p className="py-5 text-center text-sm text-gray-400">Belum ada tugas.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {columnTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="break-words text-sm font-semibold text-gray-900">{task.title}</p>
                        <p className="mb-2.5 text-xs text-gray-500">👤 {task.assignee}</p>
                        <div className="flex items-center gap-2">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                            className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                          >
                            {STATUS_VALUES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDelete(task)}
                            title="Hapus tugas"
                            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        Data tersimpan di database bersama — semua anggota tim melihat data yang sama.
      </p>
    </main>
  );
}
