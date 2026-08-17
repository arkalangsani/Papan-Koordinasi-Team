// Pengganti lokal untuk `@vercel/postgres`, HANYA untuk coba-coba di laptop.
// Dipasang lewat alias webpack di next.config.js (branch `coba-lokal` saja).
//
// PGlite adalah Postgres asli yang dikompilasi ke WASM dan berjalan di dalam
// proses Node — tidak butuh server, akun, atau connection string. Jadi semua
// SQL di lib/db.ts (SERIAL, ON CONFLICT, RETURNING, ALTER TABLE ...) jalan
// dengan semantik Postgres yang sama seperti di produksi.
//
// Datanya disimpan di folder .pglite-data/ (sudah di-gitignore).

const path = require("path");

const DATA_DIR = path.join(process.cwd(), ".pglite-data");

// Simpan di globalThis supaya hot-reload Next.js tidak membuka database
// berkali-kali (PGlite hanya boleh dibuka satu instance per folder data).
const g = globalThis;

function getDb() {
  if (!g.__pgliteDb) {
    g.__pgliteDb = import("@electric-sql/pglite").then(({ PGlite }) => {
      console.log(`[pglite] database lokal: ${DATA_DIR}`);
      return new PGlite(DATA_DIR);
    });
  }
  return g.__pgliteDb;
}

// PGlite melayani satu query pada satu waktu. Query dari beberapa request
// dirantai berurutan supaya tidak saling menimpa.
function enqueue(work) {
  const next = (g.__pgliteQueue || Promise.resolve()).then(work, work);
  // Rantai antrean tidak boleh putus kalau satu query gagal.
  g.__pgliteQueue = next.catch(() => {});
  return next;
}

// sql`SELECT * FROM t WHERE id = ${id}` -> query("SELECT * FROM t WHERE id = $1", [id])
function sql(strings, ...values) {
  const text = strings.reduce(
    (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
    ""
  );
  return enqueue(async () => {
    const db = await getDb();
    const result = await db.query(text, values);
    const rows = result.rows ?? [];
    return {
      rows,
      // db.ts memakai rowCount untuk DELETE; PGlite menamainya affectedRows.
      rowCount: result.affectedRows ?? rows.length,
      fields: result.fields ?? [],
      command: "",
    };
  });
}

module.exports = { sql, db: { query: sql }, createPool: () => ({ sql }) };
