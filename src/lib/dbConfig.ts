/**
 * Helper murni konfigurasi database — tanpa React, tanpa fetch.
 * Pola parse/build mengikuti project Accounting-Software (mock-api/src/db.js).
 */

export interface DbConfig {
  storageMode: "local" | "postgresql";
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export const EMPTY_DB_CONFIG: DbConfig = {
  storageMode: "local",
  host: "localhost",
  port: "5432",
  database: "pos_db",
  username: "postgres",
  password: "",
  ssl: false,
};

/** Parse connection string postgresql://user:pass@host:port/db?sslmode=... */
export function parseDatabaseUrl(url: string): DbConfig | null {
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
export function buildConnectionString(cfg: DbConfig): string {
  const user = encodeURIComponent(cfg.username || "postgres");
  const pass = encodeURIComponent(cfg.password || "");
  const host = cfg.host || "localhost";
  const port = cfg.port || "5432";
  const db = encodeURIComponent(cfg.database || "pos_db");
  const ssl = cfg.ssl ? "require" : "disable";
  return `postgresql://${user}${pass ? ":" + pass : ""}@${host}:${port}/${db}?sslmode=${ssl}`;
}

/** Daftar error validasi berbahasa Indonesia (kosong = valid). */
export function validateDbConfig(cfg: DbConfig): string[] {
  const errs: string[] = [];
  if (!cfg.host.trim()) errs.push("Host wajib diisi");
  if (!cfg.database.trim()) errs.push("Nama database wajib diisi");
  const port = Number(cfg.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errs.push("Port harus angka (1–65535)");
  }
  return errs;
}

/** Versi aman untuk tampil di UI — password disembunyikan. */
export function maskConnectionString(cfg: DbConfig): string {
  const masked = { ...cfg, password: cfg.password ? "••••••" : "" };
  return buildConnectionString(masked);
}