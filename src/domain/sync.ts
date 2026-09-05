/**
 * Logika sinkronisasi murni — tanpa React, tanpa fetch, tanpa localStorage.
 *
 * Model:
 *  - Entitas yang bisa berubah membawa `updatedAt` (epoch ms) saat ditulis/diubah.
 *  - Push/flush mengirim per-entitas; server menerima hanya bila stamp barunya
 *    lebih besar dari yang tersimpan (LWW per entity key).
 *  - Penghapusan dikirim sebagai *tombstone* (entity + key + deletedAt) agar
 *    perangkat lain tidak menghidupkan kembali data yang sudah dihapus.
 *  - Perangkat yang kembali online menjalankan dua arah: flush antrian lokal,
 *    lalu merge data server (LWW) supaya kedua sisi konvergen.
 *
 * Semua fungsi murni (deterministik, tanpa I/O) sehingga teruji vitest langsung.
 */
import type { HeldOrder, Ingredient, Shift, Transaction } from "../types";
import { DELETION_LOG_LIMIT, SYNC_QUEUE_LIMIT } from "./policy";

/** Entitas yang disinkronkan. `meta` = pasangan key/value tunggal (seq). */
export type SyncEntity =
  | "transactions"
  | "shifts"
  | "heldOrders"
  | "stock"
  | "ingredients"
  | "meta";

export interface SyncOp {
  kind: "upsert" | "delete";
  entity: SyncEntity;
  /** id entitas, atau productId untuk stock, atau "seq" untuk meta */
  key: string;
}

/** Op siap kirim ke server (data dilampirkan saat buildFlushOps). */
export interface FlushOp extends SyncOp {
  data?: unknown;
  /** khusus entity "stock" */
  qty?: number;
  stamp?: number;
}

/** Keadaan lokal yang diperlukan untuk membangun/menggabungkan sync. */
export interface SyncLocalState {
  transactions: Transaction[];
  shifts: Shift[];
  heldOrders: HeldOrder[];
  stockMap: Record<string, number>;
  /** productId → stamp epoch ms; tidak ada entri = belum pernah ditulis lokal */
  stockStamp: Record<string, number>;
  /** Bahan baku (satu sumber kebenaran stok menu ber-resep) */
  ingredients?: Ingredient[];
  /** Tombstone lokal — melindungi pull dari menghidupkan kembali data yang
   *  sudah dihapus lokal tetapi belum sampai ke server (antrian belum flush). */
  deletions?: Deletion[];
}

export interface Deletion {
  entity: SyncEntity;
  key: string;
  deletedAt: number;
}

/** Bentuk data yang dikembalikan server /api/data (pull). */
export interface RemoteData {
  transactions: Array<Transaction & { updatedAt?: number }>;
  shifts: Array<Shift & { updatedAt?: number }>;
  heldOrders: Array<HeldOrder & { updatedAt?: number }>;
  stockMap: Record<string, number>;
  stockStamps: Record<string, number>;
  ingredients?: Array<Ingredient & { updatedAt?: number }>;
  deletions: Deletion[];
  seq: number;
}

export interface MergeResult extends SyncLocalState {
  /** gabungan tombstone lama + baru, untuk disimpan & dikirim ke device lain */
  deletions: Deletion[];
  /** jumlah entri lokal yang benar-benar terhapus oleh tombstone */
  removedCount: number;
  /** max(localSeq, remote.seq) — nomor nota tidak pernah mundur */
  seq: number;
}

export const INGREDIENT_ENTITIES = ["ingredients"] as const;

/**
 * Satukan antrian: hanya op TERAKHIR per (entity, key) yang tersisa.
 * Urutan hasil mengikuti kemunculan terakhir tiap kunci (stabil).
 * Bila hasil melebihi `limit`, yang terlama dibuang (FIFO dari depan).
 */
export function coalesceQueue(queue: SyncOp[], limit = SYNC_QUEUE_LIMIT): SyncOp[] {
  const order: string[] = [];
  const last = new Map<string, SyncOp>();
  for (const op of queue) {
    const k = `${op.entity}:${op.key}`;
    if (!last.has(k)) order.push(k);
    last.set(k, op);
  }
  const coalesced = order.map((k) => last.get(k)!);
  return coalesced.length > limit ? coalesced.slice(coalesced.length - limit) : coalesced;
}

/**
 * Ubah antrian mentah menjadi op siap kirim:
 *  - upsert: data diambil dari state TERKINI (bukan snapshot saat enqueue) —
 *    bila entitas sudah tidak ada di lokal (mis. transaksi keluar batas
 *    riwayat), op dibuang karena state terbaru memang tidak memilikinya.
 *  - delete: tetap dikirim sebagai tombstone apa pun kondisi state lokal.
 *  - meta/seq: selalu disertakan agar penomoran nota ikut terjaga.
 */
export function buildFlushOps(local: SyncLocalState, queue: SyncOp[], seq: number): FlushOp[] {
  const ops: FlushOp[] = [];
  for (const op of coalesceQueue(queue)) {
    if (op.kind === "delete") {
      ops.push({ ...op });
      continue;
    }
    if (op.entity === "transactions") {
      const t = local.transactions.find((x) => x.id === op.key);
      if (t) ops.push({ ...op, data: t });
    } else if (op.entity === "shifts") {
      const s = local.shifts.find((x) => x.id === op.key);
      if (s) ops.push({ ...op, data: s });
    } else if (op.entity === "heldOrders") {
      const h = local.heldOrders.find((x) => x.id === op.key);
      if (h) ops.push({ ...op, data: h });
    } else if (op.entity === "stock") {
      if (op.key in local.stockMap) {
        ops.push({
          kind: "upsert",
          entity: "stock",
          key: op.key,
          qty: local.stockMap[op.key],
          stamp: local.stockStamp[op.key] ?? 0,
        });
      }
    } else if (op.entity === "ingredients") {
      const i = (local.ingredients ?? []).find((x) => x.id === op.key);
      if (i) ops.push({ ...op, data: i });
    }
    // entity "meta": seq ditambahkan di bawah secara eksplisit
  }
  ops.push({ kind: "upsert", entity: "meta", key: "seq", data: seq });
  return ops;
}

/**
 * Gabungkan data server ke state lokal.
 *  - LWW per entitas membandingkan `updatedAt` (remote tanpa stamp = 0, kalah).
 *  - Entitas baru dari remote diadopsi; hasil diurutkan terbaru dulu.
 *  - Tombstone menghapus entitas lokal dengan stamp ≤ deletedAt (data yang
 *    dibuat ulang setelah penghapusan — stamp lebih besar — bertahan).
 *  - Stok dibandingkan per product key: stockStamp lokal vs stockStamps remote.
 *  - seq = max(localSeq, remote.seq).
 */
export function mergeServerData(
  local: SyncLocalState,
  remote: RemoteData,
  localSeq = 1,
): MergeResult {
  type stamped = { id: string; updatedAt?: number };
  // Tombstone gabungan lokal+remote: untuk (entity,key) sama, yang lebih baru menang.
  const combined = new Map<string, Deletion>();
  for (const d of [...(local.deletions ?? []), ...remote.deletions]) {
    const k = `${d.entity}:${d.key}`;
    const cur = combined.get(k);
    if (!cur || d.deletedAt > cur.deletedAt) combined.set(k, d);
  }
  const deletions: Deletion[] = [...combined.values()]
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, DELETION_LOG_LIMIT);
  // Pakai referensi asli; array hanya disalin bila benar-benar berubah —
  // bila merge tanpa dampak, pemanggil (store) bisa melewati penulisan ulang.
  const arrays: Record<"transactions" | "shifts" | "heldOrders", stamped[]> = {
    transactions: local.transactions as stamped[],
    shifts: local.shifts as stamped[],
    heldOrders: local.heldOrders as stamped[],
  };
  const dirty: Record<"transactions" | "shifts" | "heldOrders", boolean> = {
    transactions: false,
    shifts: false,
    heldOrders: false,
  };
  const stockMap = { ...local.stockMap };
  const stockStamp = { ...local.stockStamp };
  let removedCount = 0;

  const remotes = {
    transactions: remote.transactions as stamped[],
    shifts: remote.shifts as stamped[],
    heldOrders: remote.heldOrders as stamped[],
  };

  for (const entity of ["transactions", "shifts", "heldOrders"] as const) {
    const arr = arrays[entity];
    const index = new Map(arr.map((x, i) => [x.id, i]));
    for (const r of remotes[entity]) {
      const stamp = r.updatedAt ?? 0;
      const i = index.get(r.id);
      const localStamp = i !== undefined ? (arr[i].updatedAt ?? 0) : -1;
      if (i === undefined || stamp > localStamp) {
        if (!dirty[entity]) {
          arrays[entity] = [...arr];
          dirty[entity] = true;
        }
        const item = { ...r };
        if (i === undefined) {
          index.set(r.id, arrays[entity].length);
          arrays[entity].push(item);
        } else {
          arrays[entity][i] = item;
        }
      }
    }
    if (dirty[entity]) {
      arrays[entity].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    }
  }

  // Stok: perbandingan stamp per product key
  const stockKeys = new Set([...Object.keys(remote.stockMap), ...Object.keys(stockMap)]);
  for (const k of stockKeys) {
    const rStamp = remote.stockStamps[k] ?? 0;
    const lStamp = stockStamp[k] ?? 0;
    if (rStamp > lStamp && k in remote.stockMap) {
      stockMap[k] = remote.stockMap[k];
      stockStamp[k] = rStamp;
    }
  }

  // Bahan baku: LWW per ingredient id (bidang updatedAt pada objek)
  let ingredients = local.ingredients ?? [];
  if (remote.ingredients && remote.ingredients.length > 0) {
    const index = new Map(ingredients.map((x, i) => [x.id, i]));
    let dirtyIng = false;
    for (const r of remote.ingredients) {
      const stamp = r.updatedAt ?? 0;
      const i = index.get(r.id);
      const localStamp = i !== undefined ? (ingredients[i].updatedAt ?? 0) : -1;
      if (i === undefined || stamp > localStamp) {
        if (!dirtyIng) {
          ingredients = [...ingredients];
          dirtyIng = true;
        }
        if (i === undefined) {
          index.set(r.id, ingredients.length);
          ingredients.push(r);
        } else {
          ingredients[i] = r;
        }
      }
    }
  }

  // Tombstone (lokal+remote): entitas dengan stamp ≤ deletedAt ikut terhapus
  for (const entity of ["transactions", "shifts", "heldOrders"] as const) {
    for (const d of deletions) {
      if (d.entity !== entity) continue;
      const before = arrays[entity].length;
      const filtered = arrays[entity].filter(
        (x) => !(x.id === d.key && (x.updatedAt ?? 0) <= d.deletedAt),
      );
      if (filtered.length !== before) {
        arrays[entity] = filtered;
        removedCount += before - filtered.length;
      }
    }
  }

  return {
    transactions: arrays.transactions as Transaction[],
    shifts: arrays.shifts as Shift[],
    heldOrders: arrays.heldOrders as HeldOrder[],
    stockMap,
    stockStamp,
    ingredients,
    deletions,
    removedCount,
    seq: Math.max(localSeq, remote.seq),
  };
}
