/**
 * Mesin transaksi & stok — logika murni (tanpa React, tanpa storage).
 * Store memanggil fungsi ini; komponen tidak pernah menghitung ulang sendiri.
 */
import type {
  CartItem,
  OrderType,
  PaymentMethod,
  Product,
  SaleLine,
  Totals,
  Transaction,
} from "../types";
import { INVOICE_DIGITS, INVOICE_PREFIX, TAX_RATE } from "./policy";

export type ProductMap = Record<string, Product>;

/** Peta productId → qty untuk badge/validasi (konsisten dengan isi cart) */
export const cartQuantities = (cart: CartItem[]): Record<string, number> => {
  const m: Record<string, number> = {};
  for (const it of cart) m[it.productId] = it.qty;
  return m;
};

export const countItems = (cart: CartItem[]): number =>
  cart.reduce((s, i) => s + i.qty, 0);

/**
 * Rumus wajib (FR-05.A): integer rupiah, satu-satunya pembulatan Math.round.
 * Diskon dipotong sebelum pajak.
 */
export function computeTotals(
  cart: CartItem[],
  discountPct: number,
  productMap: ProductMap,
): Totals {
  const subtotal = cart.reduce(
    (s, it) => s + (productMap[it.productId]?.price ?? 0) * it.qty,
    0,
  );
  const discountAmt = Math.round((subtotal * discountPct) / 100);
  const tax = Math.round((subtotal - discountAmt) * TAX_RATE);
  return { subtotal, discountAmt, tax, total: subtotal - discountAmt + tax };
}

/** Nomor nota berikutnya, mis. SJA-0001 */
export const formatInvoice = (seq: number): string =>
  `${INVOICE_PREFIX}-${String(seq).padStart(INVOICE_DIGITS, "0")}`;

export interface NewSaleInput {
  cart: CartItem[];
  seq: number;
  cashierId: string;
  cashierName: string;
  shiftId?: string;
  orderType: OrderType;
  table: string; // mentah; Dine-in memakai trim(), Takeaway → null
  totals: Totals;
  discountPct: number;
  method: PaymentMethod;
  cash: number | null;
  productMap: ProductMap;
}

/** Bungkus satu transaksi selesai (denormalisasi nama/harga dari katalog). */
export function buildTransaction(input: NewSaleInput): Transaction {
  const { cart, seq, cashierId, cashierName, shiftId, orderType, table, totals, discountPct, method, cash, productMap } = input;
  const lines: SaleLine[] = cart.map((it) => {
    const p = productMap[it.productId];
    return { productId: it.productId, name: p.name, qty: it.qty, price: p.price };
  });
  return {
    id: `${Date.now()}-${seq}`,
    invoice: formatInvoice(seq),
    timestamp: Date.now(),
    updatedAt: Date.now(),
    cashierId,
    shiftId,
    cashier: cashierName,
    orderType,
    table: orderType === "Dine-in" ? table.trim() : null,
    lines,
    itemCount: countItems(cart),
    subtotal: totals.subtotal,
    discountPct,
    discountAmt: totals.discountAmt,
    tax: totals.tax,
    total: totals.total,
    method,
    cash,
    change: cash !== null ? cash - totals.total : null,
  };
}

/** Kurangi stok sesuai item terjual, tanpa pernah negatif. */
export function deductStock(
  stockMap: Record<string, number>,
  cart: CartItem[],
): Record<string, number> {
  const next = { ...stockMap };
  for (const it of cart) next[it.productId] = Math.max(0, (next[it.productId] ?? 0) - it.qty);
  return next;
}

/** Stok awal dari katalog (dipakai saat reset / isi ulang semua). */
export const initialStockMap = (products: readonly Product[]): Record<string, number> =>
  Object.fromEntries(products.map((p) => [p.id, p.stock]));

export interface ProductSales {
  name: string;
  qty: number;
  revenue: number;
}

/**
 * Agregasi penjualan per produk dari seluruh riwayat.
 * Kunci lama (tanpa productId) dicocokkan lewat nama.
 */
export function productSalesTotals(
  transactions: readonly Transaction[],
): Map<string, ProductSales> {
  const m = new Map<string, ProductSales>();
  for (const t of transactions) {
    for (const l of t.lines) {
      const key = l.productId ?? l.name;
      const cur = m.get(key) ?? { name: l.name, qty: 0, revenue: 0 };
      m.set(key, { name: l.name, qty: cur.qty + l.qty, revenue: cur.revenue + l.qty * l.price });
    }
  }
  return m;
}
