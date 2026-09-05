import { describe, expect, it } from "vitest";
import {
  coalesceQueue,
  buildFlushOps,
  mergeServerData,
  type SyncOp,
  type SyncLocalState,
  type RemoteData,
} from "./sync";
import type { HeldOrder, Shift, Transaction } from "../types";

const tx = (id: string, updatedAt: number, total = 10_000): Transaction => ({
  id,
  invoice: "SJA-0001",
  timestamp: updatedAt - 1000,
  cashier: "Ayu",
  lines: [],
  itemCount: 1,
  subtotal: total,
  discountPct: 0,
  discountAmt: 0,
  tax: 0,
  total,
  method: "Tunai",
  cash: null,
  change: null,
  updatedAt,
});

const shift = (id: string, updatedAt: number): Shift => ({
  id,
  cashierId: "ayu",
  cashierName: "Ayu",
  openedAt: updatedAt - 1000,
  closedAt: null,
  openingFloat: 0,
  closingFloat: null,
  cashTotal: 0,
  allTotal: 0,
  txCount: 0,
  updatedAt,
});

const held = (id: string, updatedAt: number): HeldOrder => ({
  id,
  label: id,
  items: [],
  discountPct: 0,
  orderType: "Dine-in",
  table: "1",
  createdAt: updatedAt - 1000,
  updatedAt,
});

const localState = (over: Partial<SyncLocalState> = {}): SyncLocalState => ({
  transactions: [],
  shifts: [],
  heldOrders: [],
  stockMap: {},
  stockStamp: {},
  ...over,
});

const remote = (over: Partial<RemoteData> = {}): RemoteData => ({
  transactions: [],
  shifts: [],
  heldOrders: [],
  stockMap: {},
  stockStamps: {},
  deletions: [],
  seq: 1,
  ...over,
});

describe("coalesceQueue", () => {
  it("menyimpan hanya op terakhir per entity+key, urutan kemunculan terakhir", () => {
    const q: SyncOp[] = [
      { kind: "upsert", entity: "stock", key: "k1" },
      { kind: "upsert", entity: "transactions", key: "t1" },
      { kind: "delete", entity: "stock", key: "k1" },
      { kind: "upsert", entity: "transactions", key: "t2" },
    ];
    expect(coalesceQueue(q, 500)).toEqual([
      { kind: "delete", entity: "stock", key: "k1" },
      { kind: "upsert", entity: "transactions", key: "t1" },
      { kind: "upsert", entity: "transactions", key: "t2" },
    ]);
  });

  it("membuang op tertua bila melewati batas", () => {
    const q: SyncOp[] = [
      { kind: "upsert", entity: "transactions", key: "t1" },
      { kind: "upsert", entity: "transactions", key: "t2" },
      { kind: "upsert", entity: "transactions", key: "t3" },
    ];
    expect(coalesceQueue(q, 2)).toEqual([
      { kind: "upsert", entity: "transactions", key: "t2" },
      { kind: "upsert", entity: "transactions", key: "t3" },
    ]);
  });
});

describe("buildFlushOps", () => {
  it("upsert untuk key yang masih ada — data diambil dari state terkini", () => {
    const t = tx("t1", 1000);
    const ops = buildFlushOps(
      localState({ transactions: [t] }),
      [{ kind: "upsert", entity: "transactions", key: "t1" }],
      7,
    );
    expect(ops).toContainEqual({ kind: "upsert", entity: "transactions", key: "t1", data: t });
  });

  it("upsert untuk key yang sudah tidak ada dibuang; hanya seq meta yang tersisa", () => {
    const ops = buildFlushOps(
      localState(),
      [{ kind: "upsert", entity: "transactions", key: "t1" }],
      1,
    );
    expect(ops).toEqual([{ kind: "upsert", entity: "meta", key: "seq", data: 1 }]);
  });

  it("delete tetap dikirim sebagai tombstone walau key tak ada lagi", () => {
    const ops = buildFlushOps(
      localState(),
      [{ kind: "delete", entity: "heldOrders", key: "h1" }],
      1,
    );
    expect(ops).toEqual([
      { kind: "delete", entity: "heldOrders", key: "h1" },
      { kind: "upsert", entity: "meta", key: "seq", data: 1 },
    ]);
  });

  it("stock upsert membawa qty + stamp terkini", () => {
    const ops = buildFlushOps(
      localState({ stockMap: { k1: 5 }, stockStamp: { k1: 1234 } }),
      [{ kind: "upsert", entity: "stock", key: "k1" }],
      1,
    );
    expect(ops).toEqual([
      { kind: "upsert", entity: "stock", key: "k1", qty: 5, stamp: 1234 },
      { kind: "upsert", entity: "meta", key: "seq", data: 1 },
    ]);
  });

  it("selalu menyertakan op seq meta", () => {
    const ops = buildFlushOps(localState(), [], 42);
    expect(ops).toEqual([{ kind: "upsert", entity: "meta", key: "seq", data: 42 }]);
  });
});

describe("mergeServerData — LWW per entitas", () => {
  it("remote lebih baru menang", () => {
    const r = mergeServerData(
      localState({ transactions: [tx("t1", 1000)] }),
      remote({ transactions: [tx("t1", 2000, 99_000)], seq: 5 }),
    );
    expect(r.transactions[0].total).toBe(99_000);
    expect(r.seq).toBe(5);
  });

  it("lokal lebih baru menang — array identitas tetap stabil (no-op merge)", () => {
    const localTx = [tx("t1", 2000)];
    const r = mergeServerData(
      localState({ transactions: localTx }),
      remote({ transactions: [tx("t1", 1000)] }),
    );
    expect(r.transactions).toBe(localTx);
  });

  it("remote tanpa updatedAt (legacy) kalah dari lokal bertanda", () => {
    const legacy = tx("t1", 0);
    const r = mergeServerData(
      localState({ transactions: [tx("t1", 500)] }),
      remote({ transactions: [legacy] }),
    );
    expect(r.transactions[0].updatedAt).toBe(500);
  });

  it("entitas baru dari remote diadopsi & hasil diurutkan terbaru dulu", () => {
    const r = mergeServerData(
      localState({ transactions: [tx("t1", 1000)] }),
      remote({ transactions: [tx("t1", 1000), tx("t2", 3000), tx("t3", 2000)] }),
    );
    expect(r.transactions.map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });

  it("tombstone menghapus lokal yang lebih tua atau sama", () => {
    const r = mergeServerData(
      localState({ heldOrders: [held("h1", 1000)] }),
      remote({ deletions: [{ entity: "heldOrders", key: "h1", deletedAt: 1500 }] }),
    );
    expect(r.heldOrders).toEqual([]);
    expect(r.removedCount).toBe(1);
  });

  it("lokal yang dibuat ulang setelah penghapusan bertahan", () => {
    const recreated = held("h1", 3000);
    const r = mergeServerData(
      localState({ heldOrders: [recreated] }),
      remote({
        heldOrders: [],
        deletions: [{ entity: "heldOrders", key: "h1", deletedAt: 1500 }],
      }),
    );
    expect(r.heldOrders).toEqual([recreated]);
  });

  it("tombstone tanpa padanan lokal tidak dihitung removed", () => {
    const r = mergeServerData(
      localState(),
      remote({ deletions: [{ entity: "transactions", key: "tx9", deletedAt: 100 }] }),
    );
    expect(r.removedCount).toBe(0);
  });
});

describe("mergeServerData — stok per kunci", () => {
  it("remote menang bila stamp-nya lebih baru", () => {
    const r = mergeServerData(
      localState({ stockMap: { k1: 3 }, stockStamp: { k1: 100 } }),
      remote({ stockMap: { k1: 9 }, stockStamps: { k1: 200 } }),
    );
    expect(r.stockMap.k1).toBe(9);
    expect(r.stockStamp.k1).toBe(200);
  });

  it("lokal menang bila stamp-nya lebih baru", () => {
    const r = mergeServerData(
      localState({ stockMap: { k1: 3 }, stockStamp: { k1: 300 } }),
      remote({ stockMap: { k1: 9 }, stockStamps: { k1: 200 } }),
    );
    expect(r.stockMap.k1).toBe(3);
  });

  it("perangkat baru mengadopsi stok server tanpa stamp lokal", () => {
    const r = mergeServerData(
      localState(),
      remote({ stockMap: { k1: 9 }, stockStamps: { k1: 200 } }),
    );
    expect(r.stockMap.k1).toBe(9);
  });
});
