/**
 * Klien API server sinkronisasi (server/).
 * BASE default = origin yang sama (proxy Vite /api → localhost:3002 di dev;
 * di produksi, balik proxy menunjuk ke service API). Bisa dioverride
 * dengan env VITE_API_URL, mis. "http://192.168.1.5:3002".
 */
import type { DbConfig } from "./dbConfig";
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
};