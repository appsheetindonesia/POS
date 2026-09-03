import type { Category, Product } from "../types";

export const CATEGORIES: { name: Category; emoji: string }[] = [
  { name: "Kopi", emoji: "☕" },
  { name: "Non-Kopi", emoji: "🍵" },
  { name: "Makanan", emoji: "🍛" },
  { name: "Camilan", emoji: "🥐" },
];

export const CATEGORY_TINT: Record<Category, { bg: string; ring: string; chip: string }> = {
  Kopi: { bg: "bg-gold/15", ring: "group-hover:ring-gold/50", chip: "bg-gold/20 text-gold-deep" },
  "Non-Kopi": { bg: "bg-pine/10", ring: "group-hover:ring-pine/40", chip: "bg-pine/15 text-pine" },
  Makanan: { bg: "bg-tomato/10", ring: "group-hover:ring-tomato/40", chip: "bg-tomato/15 text-tomato" },
  Camilan: { bg: "bg-moss/15", ring: "group-hover:ring-moss/40", chip: "bg-moss/20 text-pine" },
};

export const PRODUCTS: Product[] = [
  // ── Kopi ──────────────────────────────────────────────
  { id: "k1", name: "Es Kopi Susu Senja", price: 24000, category: "Kopi", emoji: "🥤", desc: "Espresso, susu segar, gula aren", popular: true },
  { id: "k2", name: "Americano", price: 22000, category: "Kopi", emoji: "☕", desc: "Double shot, panas / dingin" },
  { id: "k3", name: "Caffe Latte", price: 28000, category: "Kopi", emoji: "🍮", desc: "Espresso & steamed milk" },
  { id: "k4", name: "Cappuccino", price: 26000, category: "Kopi", emoji: "☕", desc: "Foam tebal, taburan kakao" },
  { id: "k5", name: "Cold Brew Aren", price: 27000, category: "Kopi", emoji: "🧊", desc: "Seduhan 18 jam, smooth", popular: true },
  { id: "k6", name: "Kopi Tubruk Gayo", price: 18000, category: "Kopi", emoji: "🫖", desc: "Gayo wine, seduh klasik" },
  { id: "k7", name: "Affogato", price: 30000, category: "Kopi", emoji: "🍨", desc: "Espresso di atas gelato vanila" },
  // ── Non-Kopi ──────────────────────────────────────────
  { id: "n1", name: "Matcha Latte", price: 30000, category: "Non-Kopi", emoji: "🍵", desc: "Uji matcha, susu oat", popular: true },
  { id: "n2", name: "Cokelat Hazelnut", price: 28000, category: "Non-Kopi", emoji: "🍫", desc: "Dark chocolate, sirup hazelnut" },
  { id: "n3", name: "Es Teh Lemon Selasih", price: 15000, category: "Non-Kopi", emoji: "🍋", desc: "Teh melati, lemon peras" },
  { id: "n4", name: "Es Jeruk Peras", price: 14000, category: "Non-Kopi", emoji: "🍊", desc: "Jeruk peras segar, tanpa pengawet" },
  { id: "n5", name: "Air Mineral 600ml", price: 8000, category: "Non-Kopi", emoji: "💧", desc: "Dingin / suhu ruang" },
  // ── Makanan ───────────────────────────────────────────
  { id: "m1", name: "Nasi Goreng Senja", price: 28000, category: "Makanan", emoji: "🍛", desc: "Telur, ayam suwir, kerupuk", popular: true },
  { id: "m2", name: "Mie Goreng Jawa", price: 25000, category: "Makanan", emoji: "🍜", desc: "Bumbu kecap, telur ceplok" },
  { id: "m3", name: "Roti Bakar Cokelat", price: 18000, category: "Makanan", emoji: "🍞", desc: "Sourdough, cokelat lumer" },
  { id: "m4", name: "Kentang Truffle", price: 22000, category: "Makanan", emoji: "🍟", desc: "Minyak truffle, parmesan" },
  // ── Camilan ───────────────────────────────────────────
  { id: "c1", name: "Butter Croissant", price: 24000, category: "Camilan", emoji: "🥐", desc: "Renyah, butter Prancis" },
  { id: "c2", name: "Pisang Goreng Keju", price: 20000, category: "Camilan", emoji: "🍌", desc: "Keju cheddar parut, susu kental", popular: true },
  { id: "c3", name: "Donat Gula Aren", price: 12000, category: "Camilan", emoji: "🍩", desc: "Empuk, glaze aren" },
  { id: "c4", name: "Brownies Panggang", price: 16000, category: "Camilan", emoji: "🍰", desc: "Fudgy, dark chocolate 70%" },
];

export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

export const TAX_RATE = 0.1; // PPN 10%
export const CASHIER_NAME = "Ayu";
export const STORE = {
  name: "Kopi Senja",
  address: "Jl. Purnama No. 12, Yogyakarta",
  phone: "(0274) 555-0123",
};
