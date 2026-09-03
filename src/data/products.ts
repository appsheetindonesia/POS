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

const IMG = "https://image.qwenlm.ai/generated-images";

export const PRODUCTS: Product[] = [
  // ── Kopi ──────────────────────────────────────────────
  {
    id: "k1",
    name: "Es Kopi Susu Aren",
    price: 24000,
    category: "Kopi",
    emoji: "🥤",
    image: `${IMG}/433d591e-3a06-420d-83a2-b09e1d4b16c6/_result.png`,
    desc: "Espresso, susu segar, gula aren",
    popular: true,
  },
  {
    id: "k2",
    name: "Caffe Latte",
    price: 28000,
    category: "Kopi",
    emoji: "☕",
    image: `${IMG}/febc671c-bd37-42da-867c-465b8ef7d8c7/_result.png`,
    desc: "Espresso & steamed milk, latte art",
  },
  {
    id: "k3",
    name: "Cold Brew Aren",
    price: 27000,
    category: "Kopi",
    emoji: "🧊",
    image: `${IMG}/b8c54e0c-f9be-4fbb-be14-21a1601bce56/_result.png`,
    desc: "Seduhan 18 jam, twist kulit jeruk",
  },
  // ── Non-Kopi ──────────────────────────────────────────
  {
    id: "n1",
    name: "Matcha Latte",
    price: 30000,
    category: "Non-Kopi",
    emoji: "🍵",
    image: `${IMG}/cb462f6a-5440-4175-bc42-9b2f79e20fdf/_result.png`,
    desc: "Uji matcha, susu segar dingin",
    popular: true,
  },
  {
    id: "n2",
    name: "Cokelat Hazelnut",
    price: 28000,
    category: "Non-Kopi",
    emoji: "🍫",
    image: `${IMG}/6f13c7a1-893c-4f00-bb78-d50b1c82b2e9/_result.png`,
    desc: "Dark chocolate, whipped cream",
  },
  {
    id: "n3",
    name: "Es Teh Lemon Selasih",
    price: 15000,
    category: "Non-Kopi",
    emoji: "🍋",
    image: `${IMG}/cb17b4c9-deaa-4cb1-86e7-3ebd3f752bd2/_result.png`,
    desc: "Teh melati, lemon peras, selasih",
  },
  // ── Makanan ───────────────────────────────────────────
  {
    id: "m1",
    name: "Nasi Goreng Senja",
    price: 28000,
    category: "Makanan",
    emoji: "🍛",
    image: `${IMG}/9425ade2-ad5f-4403-92f9-c38278f9f2a6/_result.png`,
    desc: "Telur ceplok, sate ayam, kerupuk",
    popular: true,
  },
  {
    id: "m2",
    name: "Mie Goreng Jawa",
    price: 25000,
    category: "Makanan",
    emoji: "🍜",
    image: `${IMG}/9cc80439-29d0-4607-a1f9-2504f2909c21/_result.png`,
    desc: "Bumbu kecap, telur, bawang goreng",
  },
  // ── Camilan ───────────────────────────────────────────
  {
    id: "c1",
    name: "Butter Croissant",
    price: 24000,
    category: "Camilan",
    emoji: "🥐",
    image: `${IMG}/2d75e29e-e8d0-49ed-ae9b-194ada9532d2/_result.png`,
    desc: "Renyah, butter Prancis",
  },
  {
    id: "c2",
    name: "Pisang Goreng Keju",
    price: 20000,
    category: "Camilan",
    emoji: "🍌",
    image: `${IMG}/871ebaf8-34d5-48d3-afc9-8fcda79d7450/_result.png`,
    desc: "Keju cheddar parut, susu kental",
  },
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
