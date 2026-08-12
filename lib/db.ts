import { sql } from "@vercel/postgres";
import { STATUS_VALUES, TaskStatus } from "./constants";

export type Task = {
  id: number;
  title: string;
  assignee: string;
  status: TaskStatus;
  progress_percent: number;
  updated_at: string;
  created_at: string;
};

let tableReady: Promise<void> | null = null;

// Membuat tabel jika belum ada, dan menambah kolom baru pada tabel lama
// yang sudah ada (idempotent) supaya deploy tidak butuh migrasi manual.
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        assignee TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'belum_mulai',
        progress_percent INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
      .then(() => sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0;`)
      .then(() => undefined);
  }
  return tableReady;
}

export async function listTasks(): Promise<Task[]> {
  await ensureTable();
  const { rows } = await sql<Task>`
    SELECT id, title, assignee, status, progress_percent, updated_at, created_at
    FROM tasks
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function createTask(title: string, assignee: string, status: TaskStatus): Promise<Task> {
  await ensureTable();
  const initialProgress = status === "selesai" ? 100 : 0;
  const { rows } = await sql<Task>`
    INSERT INTO tasks (title, assignee, status, progress_percent)
    VALUES (${title}, ${assignee}, ${status}, ${initialProgress})
    RETURNING id, title, assignee, status, progress_percent, updated_at, created_at;
  `;
  return rows[0];
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task | null> {
  await ensureTable();
  const { rows } = await sql<Task>`
    UPDATE tasks
    SET status = ${status},
        progress_percent = CASE
          WHEN ${status} = 'selesai' THEN 100
          WHEN ${status} = 'belum_mulai' THEN 0
          ELSE progress_percent
        END,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, title, assignee, status, progress_percent, updated_at, created_at;
  `;
  return rows[0] ?? null;
}

export async function updateTaskProgress(id: number, progressPercent: number): Promise<Task | null> {
  await ensureTable();
  const { rows } = await sql<Task>`
    UPDATE tasks
    SET progress_percent = ${progressPercent}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, title, assignee, status, progress_percent, updated_at, created_at;
  `;
  return rows[0] ?? null;
}

export async function deleteTask(id: number): Promise<boolean> {
  await ensureTable();
  const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${id};`;
  return (rowCount ?? 0) > 0;
}

export function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (STATUS_VALUES as readonly string[]).includes(value);
}
