/**
 * API Kopi Senja POS — jembatan antara aplikasi (browser) dan PostgreSQL.
 *
 * Sinkronisasi LWW (last-write-wins per entitas, stamp epoch ms):
 *   GET  /api/health             → cek server hidup
 *   GET  /api/db/status          → konfigurasi & status koneksi saat ini
 *   POST /api/db/config          → simpan config (file) + buat pool + migrasi
 *   POST /api/db/test-connection → SELECT 1 via pool sementara (tombol Uji Koneksi)
 *   POST /api/sync/ops           → terapkan ops per-entitas: upsert diterima
 *                                  hanya bila stamp > stamp tersimpan (LWW);
 *                                  delete dicatat sebagai tombstone.
 *   GET  /api/data               → seluruh data + stamp + log penghapusan
 *
 * Legacy: POST /api/sync/push masih tersedia (seluruh dataset, menimpa server)
 * untuk kompatibilitas UI lama; UI baru memakai /api/sync/ops.
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

/* ── Endpoint dasar ── */
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

/* ── Sinkronisasi LWW: ops per-entitas ──
 * Body: { ops: [
 *   { kind:"upsert", entity:"transactions"|"shifts"|"heldOrders", key, data }   // data.updatedAt = epoch ms
 *   { kind:"upsert", entity:"stock", key, qty, stamp }                          // stamp = epoch ms
 *   { kind:"upsert", entity:"meta", key:"seq", data:number }
 *   { kind:"delete", entity, key, deletedAt? }                                  // deletedAt default now()
 * ] }
 * Upsert diterima hanya bila stamp lebih baru (atau stamp server NULL/legacy → 0).
 * Delete selalu diterapkan bila deletedAt > stamp entitas yang tersimpan.
 */
const ENTITIES = {
  transactions: { table: "pos_transactions", pk: "id" },
  shifts: { table: "pos_shifts", pk: "id" },
  heldOrders: { table: "pos_held_orders", pk: "id" },
  ingredients: { table: "pos_ingredients", pk: "id" },
};

app.post("/api/sync/ops", async (req, res) => {
  const { cfg } = readConfig();
  if (!cfg) return res.status(400).json({ ok: false, message: "Belum ada konfigurasi database" });
  const ops = Array.isArray(req.body?.ops) ? req.body.ops : [];
  if (ops.length === 0) return res.status(400).json({ ok: false, message: "Tidak ada ops" });
  const pool = getPool(cfg);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let applied = 0;
    let skipped = 0;
    let deletions = 0;

    for (const op of ops) {
      if (!op || typeof op !== "object") { skipped++; continue; }

      if (op.kind === "upsert" && ENTITIES[op.entity]) {
        const { table, pk } = ENTITIES[op.entity];
        const data = op.data;
        if (!data || typeof data !== "object" || !data[pk]) { skipped++; continue; }
        const stamp = Number(data.updatedAt ?? 0) || 0;
        // Penjaga tombstone: jangan hidupkan kembali entitas yang sudah dihapus
        // (stamp tulisan harus LEBIH BARU dari tombstone agar diterima).
        const tomb = await client.query(
          `SELECT 1 FROM pos_deletions WHERE entity = $1 AND key = $2 AND deleted_at >= $3`,
          [String(op.entity), String(data[pk]), stamp],
        );
        if (tomb.rowCount > 0) { skipped++; continue; }
        const r = await client.query(
          `INSERT INTO ${table} (${pk}, data, updated_at)
           VALUES ($1, $2, to_timestamp($3 / 1000.0))
           ON CONFLICT (${pk}) DO UPDATE
             SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
           WHERE ${table}.updated_at <= EXCLUDED.updated_at`,
          [String(data[pk]), JSON.stringify(data), stamp],
        );
        if (r.rowCount > 0) { applied++; } else { skipped++; }
        continue;
      }

      if (op.kind === "upsert" && op.entity === "stock") {
        const qty = Number(op.qty);
        const stamp = Number(op.stamp ?? 0) || 0;
        if (!op.key || !Number.isFinite(qty)) { skipped++; continue; }
        const r = await client.query(
          `INSERT INTO pos_stock (product_id, qty, updated_at)
           VALUES ($1, $2, to_timestamp($3 / 1000.0))
           ON CONFLICT (product_id) DO UPDATE
             SET qty = EXCLUDED.qty, updated_at = EXCLUDED.updated_at
           WHERE pos_stock.updated_at <= EXCLUDED.updated_at`,
          [String(op.key), Math.max(0, Math.trunc(qty)), stamp],
        );
        if (r.rowCount > 0) { applied++; } else { skipped++; }
        continue;
      }

      if (op.kind === "upsert" && op.entity === "meta") {
        const value = op.data;
        if (!op.key) { skipped++; continue; }
        await client.query(
          `INSERT INTO pos_meta (key, value, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (key) DO UPDATE
             SET value = EXCLUDED.value, updated_at = now()`,
          [String(op.key), JSON.stringify(value)],
        );
        applied++;
        continue;
      }

      if (op.kind === "delete") {
        const deletedAt = Number(op.deletedAt ?? Date.now()) || Date.now();
        let handled = false;
        if (ENTITIES[op.entity]) {
          const { table, pk } = ENTITIES[op.entity];
          const r = await client.query(
            `DELETE FROM ${table}
             WHERE ${pk} = $1
               AND updated_at <= to_timestamp($2 / 1000.0)`,
            [String(op.key), deletedAt],
          );
          handled = true;
          if (r.rowCount > 0) deletions++;
        } else if (op.entity === "stock") {
          await client.query(
            `DELETE FROM pos_stock
             WHERE product_id = $1 AND updated_at <= to_timestamp($2 / 1000.0)`,
            [String(op.key), deletedAt],
          );
          handled = true;
        }
        if (handled) {
          // Catat tombstone — SELALU, agar perangkat lain tahu (LWW pada log):
          // tulis hanya bila lebih baru dari tombstone yang sudah ada.
          await client.query(
            `INSERT INTO pos_deletions (entity, key, deleted_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (entity, key) DO UPDATE
               SET deleted_at = EXCLUDED.deleted_at
             WHERE pos_deletions.deleted_at < EXCLUDED.deleted_at`,
            [String(op.entity), String(op.key), deletedAt],
          );
          applied++;
        } else {
          skipped++;
        }
        continue;
      }

      skipped++;
    }

    await client.query("COMMIT");
    res.json({ ok: true, applied, skipped, deletions });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ ok: false, message: `Gagal sinkron: ${err.message}` });
  } finally {
    client.release();
  }
});

/* ── Pull: seluruh data + stamp + log penghapusan ── */
app.get("/api/data", async (_req, res) => {
  const { cfg } = readConfig();
  if (!cfg) return res.status(400).json({ ok: false, message: "Belum ada konfigurasi database" });
  const pool = getPool(cfg);
  try {
    const [tx, stock, shifts, held, meta, dels, ings] = await Promise.all([
      pool.query("SELECT data, updated_at FROM pos_transactions ORDER BY updated_at"),
      pool.query("SELECT product_id, qty, updated_at FROM pos_stock"),
      pool.query("SELECT data, updated_at FROM pos_shifts ORDER BY updated_at"),
      pool.query("SELECT data, updated_at FROM pos_held_orders ORDER BY updated_at"),
      pool.query("SELECT key, value FROM pos_meta"),
      pool.query("SELECT entity, key, deleted_at FROM pos_deletions"),
      pool.query("SELECT data, updated_at FROM pos_ingredients ORDER BY updated_at"),
      // GC tombstone: tulisan offline > 30 hari tidak lagi dilindungi —
      // perangkat yang offline lebih lama dari itu dapat menghidupkan kembali
      // data lama (tradeoff standar log penghapusan; menjaga pertumbuhan log).
      pool.query("DELETE FROM pos_deletions WHERE deleted_at < (EXTRACT(EPOCH FROM now() - interval '30 days') * 1000)"),
    ]);
    res.json({
      transactions: tx.rows.map((r) => ({ ...r.data, updatedAt: Date.parse(r.updated_at) })),
      shifts: shifts.rows.map((r) => ({ ...r.data, updatedAt: Date.parse(r.updated_at) })),
      heldOrders: held.rows.map((r) => ({ ...r.data, updatedAt: Date.parse(r.updated_at) })),
      stockMap: Object.fromEntries(stock.rows.map((r) => [r.product_id, r.qty])),
      stockStamps: Object.fromEntries(stock.rows.map((r) => [r.product_id, Date.parse(r.updated_at)])),
      ingredients: ings.rows.map((r) => ({ ...r.data, updatedAt: Date.parse(r.updated_at) })),
      deletions: dels.rows.map((r) => ({
        entity: r.entity,
        key: r.key,
        deletedAt: Number(r.deleted_at),
      })),
      seq: Number(meta.rows.find((r) => r.key === "seq")?.value ?? 1),
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: `Gagal ambil data: ${err.message}` });
  }
});

/* ── Legacy: push seluruh dataset (kompatibilitas UI lama) ── */
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
      const stamp = Number(t.updatedAt ?? Date.now()) || Date.now();
      await client.query(
        "INSERT INTO pos_transactions (id, data, updated_at) VALUES ($1, $2, to_timestamp($3 / 1000.0)) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at",
        [t.id, JSON.stringify(t), stamp],
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
      const stamp = Number(s.updatedAt ?? Date.now()) || Date.now();
      await client.query(
        "INSERT INTO pos_shifts (id, data, updated_at) VALUES ($1, $2, to_timestamp($3 / 1000.0)) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at",
        [s.id, JSON.stringify(s), stamp],
      );
    }
    await client.query("DELETE FROM pos_held_orders");
    for (const h of heldOrders) {
      const stamp = Number(h.updatedAt ?? Date.now()) || Date.now();
      await client.query(
        "INSERT INTO pos_held_orders (id, data, updated_at) VALUES ($1, $2, to_timestamp($3 / 1000.0)) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at",
        [h.id, JSON.stringify(h), stamp],
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
