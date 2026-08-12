import { sql } from "@vercel/postgres";
import { STATUS_VALUES, TaskStatus } from "./constants";

export type Task = {
  id: number;
  title: string;
  assignee: string;
  status: TaskStatus;
  updated_at: string;
  created_at: string;
};

let tableReady: Promise<void> | null = null;

// Membuat tabel jika belum ada. Dipanggil sebelum setiap query
// supaya deploy pertama tidak butuh langkah migrasi manual.
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        assignee TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'belum_mulai',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `.then(() => undefined);
  }
  return tableReady;
}

export async function listTasks(): Promise<Task[]> {
  await ensureTable();
  const { rows } = await sql<Task>`
    SELECT id, title, assignee, status, updated_at, created_at
    FROM tasks
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function createTask(title: string, assignee: string, status: TaskStatus): Promise<Task> {
  await ensureTable();
  const { rows } = await sql<Task>`
    INSERT INTO tasks (title, assignee, status)
    VALUES (${title}, ${assignee}, ${status})
    RETURNING id, title, assignee, status, updated_at, created_at;
  `;
  return rows[0];
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task | null> {
  await ensureTable();
  const { rows } = await sql<Task>`
    UPDATE tasks
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, title, assignee, status, updated_at, created_at;
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
