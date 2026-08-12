import { sql } from "@vercel/postgres";
import { STATUS_VALUES, TaskStatus } from "./constants";

export type Project = {
  id: number;
  slug: string;
  name: string;
  created_at: string;
};

export type Task = {
  id: number;
  project_id: number;
  title: string;
  assignee: string;
  status: TaskStatus;
  progress_percent: number;
  deadline: string | null;
  updated_at: string;
  created_at: string;
};

const DEFAULT_PROJECT_SLUG = "umum";
const DEFAULT_PROJECT_NAME = "Umum";

let tableReady: Promise<void> | null = null;

// Membuat tabel jika belum ada, dan menambah kolom/tabel baru pada database
// lama yang sudah ada (idempotent) supaya deploy tidak butuh migrasi manual.
// Tugas lama (dari sebelum fitur multi-project) otomatis dipindahkan ke
// project default "Umum" supaya datanya tidak hilang.
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id),
          title TEXT NOT NULL,
          assignee TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'belum_mulai',
          progress_percent INTEGER NOT NULL DEFAULT 0,
          deadline TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0;`;
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);`;
      // Disimpan sebagai TEXT "YYYY-MM-DD" (bukan tipe DATE) supaya tidak
      // kena pergeseran tanggal akibat konversi timezone saat dibaca.
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline TEXT;`;

      await sql`
        INSERT INTO projects (slug, name)
        VALUES (${DEFAULT_PROJECT_SLUG}, ${DEFAULT_PROJECT_NAME})
        ON CONFLICT (slug) DO NOTHING;
      `;
      const { rows } = await sql<{ id: number }>`
        SELECT id FROM projects WHERE slug = ${DEFAULT_PROJECT_SLUG};
      `;
      const defaultProjectId = rows[0]?.id;
      if (defaultProjectId) {
        await sql`UPDATE tasks SET project_id = ${defaultProjectId} WHERE project_id IS NULL;`;
      }
    })();
  }
  return tableReady;
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "project";
}

export async function listProjects(): Promise<Project[]> {
  await ensureTable();
  const { rows } = await sql<Project>`
    SELECT id, slug, name, created_at FROM projects ORDER BY created_at ASC;
  `;
  return rows;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  await ensureTable();
  const { rows } = await sql<Project>`
    SELECT id, slug, name, created_at FROM projects WHERE slug = ${slug};
  `;
  return rows[0] ?? null;
}

export async function createProject(name: string): Promise<Project> {
  await ensureTable();
  const base = slugify(name);
  let slug = base;
  let attempt = 1;
  // Cari slug unik kalau nama project sudah dipakai project lain.
  for (;;) {
    const { rows } = await sql`SELECT 1 FROM projects WHERE slug = ${slug};`;
    if (rows.length === 0) break;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  const { rows } = await sql<Project>`
    INSERT INTO projects (slug, name)
    VALUES (${slug}, ${name})
    RETURNING id, slug, name, created_at;
  `;
  return rows[0];
}

export async function renameProject(id: number, name: string): Promise<Project | null> {
  await ensureTable();
  const { rows } = await sql<Project>`
    UPDATE projects SET name = ${name} WHERE id = ${id}
    RETURNING id, slug, name, created_at;
  `;
  return rows[0] ?? null;
}

export async function deleteProject(id: number): Promise<boolean> {
  await ensureTable();
  await sql`DELETE FROM tasks WHERE project_id = ${id};`;
  const { rowCount } = await sql`DELETE FROM projects WHERE id = ${id};`;
  return (rowCount ?? 0) > 0;
}

export async function listTasks(projectId: number): Promise<Task[]> {
  await ensureTable();
  const { rows } = await sql<Task>`
    SELECT id, project_id, title, assignee, status, progress_percent, deadline, updated_at, created_at
    FROM tasks
    WHERE project_id = ${projectId}
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function createTask(
  projectId: number,
  title: string,
  assignee: string,
  status: TaskStatus,
  deadline: string | null
): Promise<Task> {
  await ensureTable();
  const initialProgress = status === "selesai" ? 100 : 0;
  const { rows } = await sql<Task>`
    INSERT INTO tasks (project_id, title, assignee, status, progress_percent, deadline)
    VALUES (${projectId}, ${title}, ${assignee}, ${status}, ${initialProgress}, ${deadline})
    RETURNING id, project_id, title, assignee, status, progress_percent, deadline, updated_at, created_at;
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
    RETURNING id, project_id, title, assignee, status, progress_percent, deadline, updated_at, created_at;
  `;
  return rows[0] ?? null;
}

export async function updateTaskProgress(id: number, progressPercent: number): Promise<Task | null> {
  await ensureTable();
  const { rows } = await sql<Task>`
    UPDATE tasks
    SET progress_percent = ${progressPercent}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, project_id, title, assignee, status, progress_percent, deadline, updated_at, created_at;
  `;
  return rows[0] ?? null;
}

export async function updateTaskDeadline(id: number, deadline: string | null): Promise<Task | null> {
  await ensureTable();
  const { rows } = await sql<Task>`
    UPDATE tasks
    SET deadline = ${deadline}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, project_id, title, assignee, status, progress_percent, deadline, updated_at, created_at;
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
