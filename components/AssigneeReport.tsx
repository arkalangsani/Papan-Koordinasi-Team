"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/lib/db";
import { STATUS_LABELS, TaskStatus } from "@/lib/constants";

type AssigneeStat = {
  assignee: string;
  total: number;
  belum_mulai: number;
  dikerjakan: number;
  selesai: number;
  percent: number;
};

function formatDeadline(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_BADGE_STYLES: Record<TaskStatus, string> = {
  belum_mulai: "bg-slate-200 text-slate-700",
  dikerjakan: "bg-amber-200 text-amber-800",
  selesai: "bg-green-200 text-green-800",
};

export default function AssigneeReport({ tasks, onClose }: { tasks: Task[]; onClose: () => void }) {
  const [filter, setFilter] = useState("");

  const assigneeNames = useMemo(() => {
    const names = new Set(tasks.map((t) => t.assignee));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const stats = useMemo(() => {
    const map = new Map<string, AssigneeStat>();
    for (const task of tasks) {
      const entry = map.get(task.assignee) ?? {
        assignee: task.assignee,
        total: 0,
        belum_mulai: 0,
        dikerjakan: 0,
        selesai: 0,
        percent: 0,
      };
      entry.total += 1;
      entry[task.status] += 1;
      map.set(task.assignee, entry);
    }
    return Array.from(map.values())
      .map((entry) => ({ ...entry, percent: entry.total === 0 ? 0 : Math.round((entry.selesai / entry.total) * 100) }))
      .sort((a, b) => a.assignee.localeCompare(b.assignee));
  }, [tasks]);

  const filteredStats = useMemo(() => {
    if (!filter) return stats;
    return stats.filter((s) => s.assignee === filter);
  }, [stats, filter]);

  const filteredTasks = useMemo(() => {
    if (!filter) return [];
    return tasks
      .filter((t) => t.assignee === filter)
      .sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      });
  }, [tasks, filter]);

  return (
    <div
      className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Laporan Penyelesaian per Penanggung Jawab</h3>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-gray-500">Filter Penanggung Jawab</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Semua Penanggung Jawab</option>
            {assigneeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {stats.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada tugas untuk dilaporkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500">
                  <th className="pb-2 pr-3">Penanggung Jawab</th>
                  <th className="pb-2 pr-3 text-center">Total</th>
                  <th className="pb-2 pr-3 text-center">Selesai</th>
                  <th className="pb-2">% Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStats.map((stat) => (
                  <tr key={stat.assignee}>
                    <td className="py-2 pr-3 font-medium text-gray-900">👤 {stat.assignee}</td>
                    <td className="py-2 pr-3 text-center text-gray-600">{stat.total}</td>
                    <td className="py-2 pr-3 text-center text-gray-600">{stat.selesai}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${stat.percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-indigo-600">{stat.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filter && (
          <div className="mt-5">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Detail Tugas {filter}</h4>
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-gray-400">Tidak ada tugas.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {filteredTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm text-gray-900">{task.title}</span>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_STYLES[task.status]}`}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                      <span className="text-xs text-gray-500">{formatDeadline(task.deadline)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
