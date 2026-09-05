/**
 * Lapisan koneksi PostgreSQL — pola dari project Accounting-Software (mock-api/src/db.js).
 *
 * - parseDatabaseUrl / buildConnectionString: ubah config <-> connection string.
 * - testConnection: pool sementara + SELECT 1, pesan error ramah per kode.
 * - getPool: pool lazy singleton; di-destroy saat config berubah.
 * - runMigration: jalankan migrations/*.sql otomatis saat pertama konek.
 */
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

let pool = null;
let lastConfigKey = null;
let migrationRan = false;

/** Parse connection string postgresql://user:pass@host:port/db?sslmode=... */
export function parseDatabaseUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    const ssl = (parsed.searchParams.get("sslmode") ?? "disable") !== "disable";
    return {
      storageMode: "postgresql",
      host: parsed.hostname || "localhost",
      port: parsed.port || "5432",
      database: (parsed.pathname || "/pos_db").replace(/^\//, ""),
      username: decodeURIComponent(parsed.username) || "postgres",
      password: decodeURIComponent(parsed.password) || "",
      ssl,
    };
  } catch {
    return null;
  }
}

/** Bangun connection string dari config object. */
export function buildConnectionString(cfg) {
  const user = encodeURIComponent(cfg.username || "postgres");
  const pass = encodeURIComponent(cfg.password || "");
  const host = cfg.host || "localhost";
  const port = cfg.port || "5432";
  const db = encodeURIComponent(cfg.database || "pos_db");
  const ssl = cfg.ssl ? "require" : "disable";
  return `postgresql://${user}${pass ? ":" + pass : ""}@${host}:${port}/${db}?sslmode=${ssl}`;
}

function configKey(cfg) {
  return JSON.stringify({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    username: cfg.username,
    password: cfg.password,
    ssl: cfg.ssl,
  });
}

/** Pool lazy singleton — dibuat ulang saat config berubah. */
export function getPool(cfg) {
  if (!cfg || cfg.storageMode !== "postgresql") {
    destroyPool();
    return null;
  }
  const key = configKey(cfg);
  if (pool && lastConfigKey === key) return pool;

  destroyPool();
  pool = new Pool({
    connectionString: buildConnectionString(cfg),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
  lastConfigKey = key;
  pool.on("error", (err) => console.error("[DB] Pool error:", err.message));

  if (!migrationRan) {
    migrationRan = true;
    runMigration(pool).catch((err) =>
      console.error("[DB] Migration error (non-fatal):", err.message),
    );
  }
  return pool;
}

export function destroyPool() {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
    lastConfigKey = null;
  }
}

/** SELECT 1 via pool sementara — untuk tombol "Uji Koneksi". */
export async function testConnection(cfg) {
  const temp = new Pool({
    connectionString: buildConnectionString(cfg),
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 8000,
  });
  const start = Date.now();
  try {
    const result = await temp.query("SELECT 1 AS ok");
    const latencyMs = Date.now() - start;
    if (result.rows[0]?.ok === 1) {
      return {
        ok: true,
        message: `Koneksi ke ${cfg.database}@${cfg.host}:${cfg.port} berhasil`,
        latencyMs,
      };
    }
    return { ok: false, message: "Response tidak valid", latencyMs: Date.now() - start };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const hint = friendlyError(err, cfg);
    return { ok: false, message: hint, latencyMs };
  } finally {
    await temp.end().catch(() => {});
  }
}

/** Pesan error berbahasa Indonesia yang ramah, per kode error. */
export function friendlyError(err, cfg) {
  const code = err?.code;
  if (code === "ENOTFOUND") {
    return `Hostname '${cfg.host}' tidak ditemukan. Jika PostgreSQL berjalan di Docker di server remote, gunakan IP address server atau 'localhost' (jika port di-mapping), bukan nama service Docker '${cfg.host}'`;
  }
  if (code === "ECONNREFUSED") {
    return `Koneksi ditolak di ${cfg.host}:${cfg.port}. Pastikan PostgreSQL berjalan dan port ${cfg.port} terbuka dari komputer Anda`;
  }
  if (code === "ETIMEDOUT") {
    return `Koneksi timeout ke ${cfg.host}:${cfg.port}. Pastikan firewall mengizinkan koneksi ke port PostgreSQL`;
  }
  if (code === "ECONNRESET") {
    return `Koneksi terputus oleh server di ${cfg.host}:${cfg.port}. Periksa apakah PostgreSQL menerima koneksi (bukan hanya port TCP terbuka)`;
  }
  if (code === "28P01") {
    return "Autentikasi gagal — username atau password salah";
  }
  if (code === "3D000") {
    return `Database '${cfg.database}' tidak ditemukan di server ${cfg.host}`;
  }
  if (code === "53300" || code === "53400") {
    return "Terlalu banyak koneksi ke server PostgreSQL — tutup koneksi lain lalu coba lagi";
  }
  return `Gagal: ${err.message}`;
}

/** Jalankan semua file migrations/*.sql secara berurutan (idempotent). */
export async function runMigration(poolOrCfg) {
  let target = poolOrCfg;
  let temp = null;
  if (poolOrCfg.storageMode) {
    temp = new Pool({
      connectionString: buildConnectionString(poolOrCfg),
      max: 1,
      connectionTimeoutMillis: 8000,
    });
    target = temp;
  }
  try {
    const dir = join(__dirname, "..", "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      const sql = readFileSync(join(dir, f), "utf-8");
      await target.query(sql);
      console.log(`[DB] Migration ${f} OK`);
    }
  } finally {
    if (temp) await temp.end().catch(() => {});
  }
}