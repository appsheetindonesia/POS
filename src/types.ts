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
  /** Stok awal — nilai berjalan disimpan terpisah di localStorage */
  stock: number;
  popular?: boolean;
}

export interface CartItem {
  productId: string;
  qty: number;
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
