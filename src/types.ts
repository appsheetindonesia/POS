export type Category = "Kopi" | "Non-Kopi" | "Makanan" | "Camilan";

/** Filter katalog: kategori atau semua */
export type CategoryFilter = Category | "Semua";

/** Layar utama aplikasi */
export type View = "kasir" | "stok" | "riwayat";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  emoji: string;
  desc: string;
  image: string;
  /** Stok awal — nilai berjalan disimpan terpisah di localStorage.
   *  Untuk menu ber-resep, angka ini IGNORED: stok diturunkan dari bahan. */
  stock: number;
  popular?: boolean;
  /** Resep bahan baku — bila ada, stok menu = porsi turunan dari bahan */
  recipe?: RecipeLine[];
}

/** Satu bahan baku dalam persediaan (susu, gula aren, espresso, …) */
export interface Ingredient {
  id: string;
  name: string;
  /** Satuan tampilan: ml, g, pcs, … */
  unit: string;
  /** Jumlah tersedia saat ini, dalam `unit` */
  qty: number;
  /** Ambang minimum — tampil "perlu restock" bila qty < minQty */
  minQty: number;
  /** Stamp sinkronisasi LWW */
  updatedAt?: number;
}

/** Komposisi satu porsi menu: berapa `ingredientId` yang terpakai */
export interface RecipeLine {
  ingredientId: string;
  qtyPerServing: number;
}

export interface CartItem {
  productId: string;
  qty: number;
  note?: string;
}

export type PaymentMethod = "Tunai" | "QRIS" | "Kartu Debit";
export type OrderType = "Dine-in" | "Takeaway";

export interface Cashier {
  id: string;
  name: string;
  color: string;
}

export interface SaleLine {
  productId?: string;
  name: string;
  qty: number;
  price: number;
}

export interface Transaction {
  id: string;
  invoice: string;
  timestamp: number;
  cashierId?: string;
  shiftId?: string;
  cashier: string;
  orderType?: OrderType;
  table?: string | null;
  lines: SaleLine[];
  itemCount: number;
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  tax: number;
  total: number;
  method: PaymentMethod;
  cash: number | null;
  change: number | null;
  /** Stamp sinkronisasi (LWW per entitas) — diubah setiap kali transaksi ditulis ulang (mis. void) */
  updatedAt?: number;

  // ── Void / Refund ──
  voided?: boolean;
  voidedAt?: number;
  voidedBy?: string;
  voidReason?: string;
}

export interface Totals {
  subtotal: number;
  discountAmt: number;
  tax: number;
  total: number;
}

export type ToastTone = "success" | "info" | "warn";

export interface ToastMsg {
  id: number;
  text: string;
  tone: ToastTone;
}

export interface HeldOrder {
  id: string;
  label: string;
  items: CartItem[];
  discountPct: number;
  orderType: OrderType;
  table: string;
  createdAt: number;
  /** Stamp sinkronisasi (LWW per entitas) */
  updatedAt?: number;
}

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: number;
  closedAt: number | null;
  openingFloat: number;
  closingFloat: number | null;
  /** Total dari transaksi Tunai saja selama shift ini */
  cashTotal: number;
  /** Total dari semua metode (Tunai + QRIS + Debit) */
  allTotal: number;
  /** Jumlah transaksi */
  txCount: number;
  /** Stamp sinkronisasi (LWW per entitas) */
  updatedAt?: number;
}
