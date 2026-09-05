/**
 * API Kopi Senja POS — jembatan antara aplikasi (browser) dan PostgreSQL.
 *
 * Browser tidak bisa konek langsung ke Postgres, jadi server kecil ini:
 *   GET  /api/health             → cek server hidup
 *   GET  /api/db/status          → konfigurasi & status koneksi saat ini
 *   POST /api/db/config          → simpan config (file) + buat pool + migrasi
 *   POST /api/db/test-connection → SELECT 1 via pool sementara (tombol Uji Koneksi)
 *   POST /api/sync/push          → tulis data POS (transaksi/shift/stok/parkir/seq)
 *   GET  /api/data               → ambil seluruh data POS dari Postgres
 *
 * Konfigurasi: env DATABASE_URL (Easypanel) diutamakan; bila tidak ada,
 * pakai config dari file data/db-config.json (diset lewat menu Pengaturan).
 */
import express from "express";
import cors from "cors";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  destroyPool,
  getPool,
  parseDatabaseUrl,
  testConnection,
} from "./src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const CONFIG_FILE = join(DATA_DIR, "db-config.json");
const PORT = (() => {
  const p = Number(process.env.PORT);
  return Number.isInteger(p) && p > 0 ? p : 3002;
})();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ── Konfigurasi: env DATABASE_URL diutamakan, lalu file local ── */
function readConfig() {
  if (process.env.DATABASE_URL) {
    const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
    if (parsed) return { cfg: parsed, source: "env" };
  }
  try {
    if (existsSync(CONFIG_FILE)) {
      return { cfg: JSON.parse(readFileSync(CONFIG_FILE, "utf-8")), source: "file" };
    }
  } catch (err) {
    console.error("[Server] Gagal baca config file:", err.message);
  }
  return { cfg: null, source: "none" };
}

function writeConfig(cfg) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

/* ── Endpoint ── */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "senja-pos-server", time: new Date().toISOString() });
});

app.get("/api/db/status", async (_req, res) => {
  const { cfg, source } = readConfig();
  const base = { source, configured: !!cfg };
  if (!cfg) {
    return res.json({ ...base, connected: false, storageMode: "local" });
  }
  const pool = getPool(cfg);
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({
      ...base,
      storageMode: "postgresql",
      connected: r.rows[0]?.ok === 1,
      host: cfg.host,
      database: cfg.database,
      port: cfg.port,
    });
  } catch {
    res.json({ ...base, storageMode: "postgresql", connected: false, host: cfg.host, database: cfg.database });
  }
});

app.post("/api/db/test-connection", async (req, res) => {
  const body = req.body ?? {};
  const cfg = {
    storageMode: "postgresql",
    host: String(body.host || "").trim(),
    port: String(body.port || "5432").trim(),
    database: String(body.database || "").trim(),
    username: String(body.username || "").trim(),
    password: String(body.password ?? ""),
    ssl: !!body.ssl,
  };
  const result = await testConnection(cfg);
  res.status(result.ok ? 200 : 502).json(result);
});

app.post("/api/db/config", async (req, res) => {
  const body = req.body ?? {};
  const cfg = {
    storageMode: "postgresql",
    host: String(body.host || "").trim(),
    port: String(body.port || "5432").trim(),
    database: String(body.database || "").trim(),
    username: String(body.username || "").trim(),
    password: String(body.password ?? ""),
    ssl: !!body.ssl,
  };
  const test = await testConnection(cfg);
  if (!test.ok) {
    return res.status(502).json({ ok: false, message: test.message, latencyMs: test.latencyMs });
  }
  writeConfig(cfg);
  destroyPool();
  getPool(cfg); // buat pool + migrasi otomatis
  res.json({ ok: true, source: "file", configured: true, connected: true, ...test });
});

/* ── Sinkronisasi ── */
app.post("/api/sync/push", async (req, res) => {
  const { cfg } = readConfig();
  if (!cfg) return res.status(400).json({ ok: false, message: "Belum ada konfigurasi database" });
  const pool = getPool(cfg);
  const { transactions = [], stockMap = {}, shifts = [], heldOrders = [], seq = 1 } = req.body ?? {};

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM pos_transactions");
    for (const t of transactions) {
      await client.query(
        "INSERT INTO pos_transactions (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [t.id, JSON.stringify(t)],
      );
    }
    await client.query("DELETE FROM pos_stock");
    for (const [pid, qty] of Object.entries(stockMap)) {
      await client.query(
        "INSERT INTO pos_stock (product_id, qty, updated_at) VALUES ($1, $2, now()) ON CONFLICT (product_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()",
        [pid, Number(qty) || 0],
      );
    }
    await client.query("DELETE FROM pos_shifts");
    for (const s of shifts) {
      await client.query(
        "INSERT INTO pos_shifts (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [s.id, JSON.stringify(s)],
      );
    }
    await client.query("DELETE FROM pos_held_orders");
    for (const h of heldOrders) {
      await client.query(
        "INSERT INTO pos_held_orders (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [h.id, JSON.stringify(h)],
      );
    }
    await client.query(
      `INSERT INTO pos_meta (key, value, updated_at) VALUES ('seq', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(Number(seq) || 1)],
    );
    await client.query("COMMIT");
    res.json({
      ok: true,
      counts: {
        transactions: transactions.length,
        stock: Object.keys(stockMap).length,
        shifts: shifts.length,
        heldOrders: heldOrders.length,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ ok: false, message: `Gagal sinkron: ${err.message}` });
  } finally {
    client.release();
  }
});

app.get("/api/data", async (_req, res) => {
  const { cfg } = readConfig();
  if (!cfg) return res.status(400).json({ ok: false, message: "Belum ada konfigurasi database" });
  const pool = getPool(cfg);
  try {
    const [tx, stock, shifts, held, meta] = await Promise.all([
      pool.query("SELECT data FROM pos_transactions ORDER BY updated_at"),
      pool.query("SELECT product_id, qty FROM pos_stock"),
      pool.query("SELECT data FROM pos_shifts ORDER BY updated_at"),
      pool.query("SELECT data FROM pos_held_orders ORDER BY updated_at"),
      pool.query("SELECT key, value FROM pos_meta"),
    ]);
    res.json({
      transactions: tx.rows.map((r) => r.data),
      stockMap: Object.fromEntries(stock.rows.map((r) => [r.product_id, r.qty])),
      shifts: shifts.rows.map((r) => r.data),
      heldOrders: held.rows.map((r) => r.data),
      seq: Number(meta.rows.find((r) => r.key === "seq")?.value ?? 1),
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: `Gagal ambil data: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Kopi Senja API berjalan di http://localhost:${PORT}`);
  const { cfg, source } = readConfig();
  if (cfg) {
    console.log(`[Server] Konfigurasi DB dari ${source}: ${cfg.username}@${cfg.host}:${cfg.port}/${cfg.database}`);
    getPool(cfg);
  } else {
    console.log("[Server] Belum ada konfigurasi DB — atur dari menu Pengaturan aplikasi");
  }
});

process.on("SIGTERM", () => {
  destroyPool();
  process.exit(0);
});
process.on("SIGINT", () => {
  destroyPool();
  process.exit(0);
});