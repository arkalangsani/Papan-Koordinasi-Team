"use client";

import { useEffect, useMemo, useState } from "react";
import type { Project, Task } from "@/lib/db";
import { STATUS_LABELS, STATUS_VALUES, TaskStatus } from "@/lib/constants";
import AssigneeReport from "@/components/AssigneeReport";

const POLL_INTERVAL_MS = 5000;

const COLUMN_STYLES: Record<TaskStatus, string> = {
  belum_mulai: "text-gray-600",
  dikerjakan: "text-amber-700",
  selesai: "text-green-700",
};

const COLUMN_BG_STYLES: Record<TaskStatus, string> = {
  belum_mulai: "border-slate-400 bg-slate-200",
  dikerjakan: "border-amber-400 bg-amber-200",
  selesai: "border-green-400 bg-green-200",
};

const COLUMN_HEADER_BORDER_STYLES: Record<TaskStatus, string> = {
  belum_mulai: "border-slate-400",
  dikerjakan: "border-amber-400",
  selesai: "border-green-400",
};

const STATUS_BADGE_STYLES: Record<TaskStatus, string> = {
  belum_mulai: "bg-slate-200 text-slate-700",
  dikerjakan: "bg-amber-200 text-amber-800",
  selesai: "bg-green-200 text-green-800",
};

function formatDeadline(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === "selesai") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.deadline}T00:00:00`) < today;
}

function DeadlineInput({
  task,
  onCommit,
}: {
  task: Task;
  onCommit: (task: Task, value: string | null) => void;
}) {
  const overdue = isOverdue(task);
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={task.deadline ?? ""}
        onChange={(e) => onCommit(task, e.target.value || null)}
        className={`rounded-md border px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none ${
          overdue ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300"
        }`}
      />
      {overdue && <span title={`Lewat deadline (${formatDeadline(task.deadline)})`}>⚠️</span>}
    </div>
  );
}

function ProgressSlider({ task, onCommit }: { task: Task; onCommit: (task: Task, value: number) => void }) {
  const [value, setValue] = useState(task.progress_percent);

  useEffect(() => {
    setValue(task.progress_percent);
  }, [task.progress_percent]);

  function commit(raw: string) {
    onCommit(task, Number(raw));
  }

  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
        <span>Progres saya</span>
        <span className="font-semibold text-amber-700">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={(e) => commit((e.target as HTMLInputElement).value)}
        onTouchEnd={(e) => commit((e.target as HTMLInputElement).value)}
        onKeyUp={(e) => commit((e.target as HTMLInputElement).value)}
        className="w-full accent-amber-600"
        aria-label="Progres pengerjaan tugas (%)"
      />
    </div>
  );
}

export default function Board({ projectSlug }: { projectSlug: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [initialStatus, setInitialStatus] = useState<TaskStatus>("belum_mulai");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [showReport, setShowReport] = useState(false);

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${projectSlug}`, { cache: "no-store" });
      if (res.status === 404) {
        setProjectNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data.project);
    } catch {
      setError("Tidak bisa memuat data project.");
    }
  }

  async function fetchTasks(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/tasks?project=${encodeURIComponent(projectSlug)}`, { cache: "no-store" });
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
    fetchProject();
    fetchTasks(true);
    const interval = setInterval(() => fetchTasks(false), POLL_INTERVAL_MS);
    const onFocus = () => fetchTasks(false);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug]);

  const columns = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(STATUS_VALUES.map((s) => [s, []]));
    for (const task of tasks) {
      map.get(task.status)?.push(task);
    }
    return map;
  }, [tasks]);

  const progress = useMemo(() => {
    const total = tasks.length;
    const selesai = tasks.filter((t) => t.status === "selesai").length;
    const percent = total === 0 ? 0 : Math.round((selesai / total) * 100);
    return { total, selesai, percent };
  }, [tasks]);

  const recapTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
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
        body: JSON.stringify({
          project: projectSlug,
          title: trimmedTitle,
          assignee: trimmedAssignee,
          status: initialStatus,
          deadline: deadlineInput || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menambah tugas.");
      }
      setTitle("");
      setAssignee("");
      setInitialStatus("belum_mulai");
      setDeadlineInput("");
      await fetchTasks(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambah tugas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    const nextProgress = status === "selesai" ? 100 : status === "belum_mulai" ? 0 : task.progress_percent;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, progress_percent: nextProgress } : t)));
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

  async function handleProgressChange(task: Task, value: number) {
    const clamped = Math.min(100, Math.max(0, value));
    if (clamped === task.progress_percent) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, progress_percent: clamped } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: clamped }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Gagal menyimpan progres. Silakan coba lagi.");
      fetchTasks(false);
    }
  }

  async function handleDeadlineChange(task: Task, value: string | null) {
    if (value === task.deadline) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, deadline: value } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Gagal menyimpan deadline. Silakan coba lagi.");
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

  if (projectNotFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-gray-500">
          <p className="mb-3">Project tidak ditemukan.</p>
          <a href="/?list=1" className="text-sm font-semibold text-indigo-600 hover:underline">
            ← Lihat semua project
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <header className="mb-6">
        {/* <a> biasa (bukan next/link) supaya selalu reload penuh — client-side
            navigation Next.js bisa reuse cache halaman "/" dari sebelumnya
            dan mengabaikan perubahan query "?list=1". */}
        <a href="/?list=1" className="mb-2 inline-block text-xs font-semibold text-indigo-600 hover:underline">
          ← Semua Project
        </a>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📋 {project ? project.name : "Papan Koordinasi Tim"}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Lihat siapa mengerjakan apa, tanpa scroll chat WhatsApp — data yang sama untuk semua orang.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            📊 Laporan per Penanggung Jawab
          </button>
        </div>
      </header>

      {showReport && <AssigneeReport tasks={tasks} onClose={() => setShowReport(false)} />}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && recapTasks.length > 0 && (
        <section className="mb-7 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Daftar Rekap Tugas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500">
                  <th className="pb-2 pr-3">Nama Tugas</th>
                  <th className="pb-2 pr-3">Penanggung Jawab</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recapTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="py-2 pr-3 font-medium text-gray-900">{task.title}</td>
                    <td className="py-2 pr-3 text-gray-600">👤 {task.assignee}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_STYLES[task.status]}`}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="py-2">
                      <DeadlineInput task={task} onCommit={handleDeadlineChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && progress.total > 0 && (
        <section className="mb-7 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Progres Pelaksanaan</h2>
            <span className="text-lg font-bold text-indigo-600">{progress.percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {progress.selesai} dari {progress.total} tugas selesai
          </p>
        </section>
      )}

      <section className="mb-7 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Tambah Tugas Baru</h2>
        <form onSubmit={handleAddTask} className="grid gap-3 sm:grid-cols-[2fr_1.5fr_1.1fr_1.1fr_auto] sm:items-end">
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
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Deadline (opsional)</span>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
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
              <div key={status} className={`rounded-xl border-2 p-3.5 ${COLUMN_BG_STYLES[status]}`}>
                <div className={`mb-3 flex items-center justify-between border-b pb-2.5 ${COLUMN_HEADER_BORDER_STYLES[status]}`}>
                  <h3 className={`text-sm font-bold ${COLUMN_STYLES[status]}`}>{STATUS_LABELS[status]}</h3>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-500">
                    {columnTasks.length}
                  </span>
                </div>
                {columnTasks.length === 0 ? (
                  <p className="py-5 text-center text-sm text-gray-400">Belum ada tugas.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {columnTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="break-words text-sm font-semibold text-gray-900">{task.title}</p>
                        <p className="mb-2.5 text-xs text-gray-500">👤 {task.assignee}</p>
                        {task.status === "dikerjakan" && (
                          <ProgressSlider task={task} onCommit={handleProgressChange} />
                        )}
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
