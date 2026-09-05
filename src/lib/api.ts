/**
 * Klien API server sinkronisasi (server/).
 * BASE default = origin yang sama (proxy Vite /api → localhost:3002 di dev;
 * di produksi, balik proxy menunjuk ke service API). Bisa dioverride
 * dengan env VITE_API_URL, mis. "http://192.168.1.5:3002".
 */
import type { DbConfig } from "./dbConfig";
import type { Deletion } from "../domain/sync";
import type { Transaction, Shift, HeldOrder } from "../types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export interface TestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export interface DbStatus {
  source: "env" | "file" | "none";
  configured: boolean;
  connected: boolean;
  storageMode: "local" | "postgresql";
  host?: string;
  database?: string;
  port?: string;
}

export interface PushResult {
  ok: boolean;
  counts: {
    transactions: number;
    stock: number;
    shifts: number;
    heldOrders: number;
  };
}

export interface PullResult {
  transactions: Transaction[];
  stockMap: Record<string, number>;
  shifts: Shift[];
  heldOrders: HeldOrder[];
  seq: number;
  /** Stamp sinkronisasi per entitas (epoch ms) — untuk LWW merge */
  stockStamps?: Record<string, number>;
  /** Log penghapusan (tombstone) dari perangkat lain */
  deletions?: Deletion[];
}

/** Satu operasi tulis yang dikirim ke server saat flush / sinkron */
export interface SyncOpWire {
  kind: "upsert" | "delete";
  entity: "transactions" | "shifts" | "heldOrders" | "stock" | "meta";
  key: string;
  /** data utk upsert entitas (Transaction/Shift/HeldOrder) atau angka seq utk meta */
  data?: unknown;
  /** khusus entity "stock" */
  qty?: number;
  stamp?: number;
  /** khusus kind "delete" */
  deletedAt?: number;
}

export interface OpsResult {
  ok: boolean;
  applied: number;
  skipped: number;
  deletions: number;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
    if (!res.ok) {
      throw new ApiError(body?.message ?? `Server menolak permintaan (${res.status})`);
    }
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Server database tidak merespons (timeout). Pastikan server API berjalan.");
    }
    throw new ApiError(
      "Server database tidak terjangkau. Jalankan server API (npm run dev di folder server/) atau periksa URL API.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),

  dbStatus: () => request<DbStatus>("/api/db/status"),

  testConnection: (cfg: DbConfig) =>
    request<TestResult>("/api/db/test-connection", { method: "POST", body: JSON.stringify(cfg) }),

  saveConfig: (cfg: DbConfig) =>
    request<TestResult>("/api/db/config", { method: "POST", body: JSON.stringify(cfg) }),

  pushSync: (payload: {
    transactions: Transaction[];
    stockMap: Record<string, number>;
    shifts: Shift[];
    heldOrders: HeldOrder[];
    seq: number;
  }) => request<PushResult>("/api/sync/push", { method: "POST", body: JSON.stringify(payload) }),

  pullData: () => request<PullResult>("/api/data"),

  /** Kirim batch ops LWW (upsert/delete per entitas) ke server */
  pushOps: (ops: SyncOpWire[]) =>
    request<OpsResult>("/api/sync/ops", { method: "POST", body: JSON.stringify({ ops }) }),
};