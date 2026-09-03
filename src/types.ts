export type Category = "Kopi" | "Non-Kopi" | "Makanan" | "Camilan";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  emoji: string;
  desc: string;
  popular?: boolean;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export type PaymentMethod = "Tunai" | "QRIS" | "Kartu Debit";

export interface SaleLine {
  name: string;
  qty: number;
  price: number;
}

export interface Transaction {
  id: string;
  invoice: string;
  timestamp: number;
  cashier: string;
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

export interface ToastMsg {
  id: number;
  text: string;
  tone: "success" | "info" | "warn";
}
