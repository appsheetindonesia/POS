import type { Cashier, Category, Product } from "../types";

export const CATEGORIES: { name: Category; emoji: string }[] = [
  { name: "Kopi", emoji: "☕" },
  { name: "Non-Kopi", emoji: "🍵" },
  { name: "Makanan", emoji: "🍛" },
  { name: "Camilan", emoji: "🥐" },
];

export const CATEGORY_TINT: Record<Category, { bg: string; ring: string; chip: string }> = {
  Kopi: { bg: "bg-gold/15", ring: "group-hover:ring-gold/50", chip: "bg-gold/85 text-ink" },
  "Non-Kopi": { bg: "bg-pine/10", ring: "group-hover:ring-pine/40", chip: "bg-pine/85 text-milk" },
  Makanan: { bg: "bg-tomato/10", ring: "group-hover:ring-tomato/40", chip: "bg-tomato/85 text-milk" },
  Camilan: { bg: "bg-moss/15", ring: "group-hover:ring-moss/40", chip: "bg-moss/90 text-milk" },
};

const IMG = "https://image.qwenlm.ai/generated-images";

export const PRODUCTS: Product[] = [
  {
    id: "k1", name: "Es Kopi Susu Aren", price: 24000, category: "Kopi", emoji: "🥤", stock: 24,
    desc: "Espresso, susu segar, gula aren", popular: true,
    image: `${IMG}/433d591e-3a06-420d-83a2-b09e1d4b16c6/_result.png`,
  },
  {
    id: "k3", name: "Caffe Latte", price: 28000, category: "Kopi", emoji: "☕", stock: 18,
    desc: "Espresso & steamed milk, rosetta art",
    image: `${IMG}/febc671c-bd37-42da-867c-465b8ef7d8c7/_result.png`,
  },
  {
    id: "k5", name: "Cold Brew Aren", price: 27000, category: "Kopi", emoji: "🧊", stock: 12,
    desc: "Seduhan 18 jam, twist jeruk", popular: true,
    image: `${IMG}/b8c54e0c-f9be-4fbb-be14-21a1601bce56/_result.png`,
  },
  {
    id: "n1", name: "Matcha Latte", price: 30000, category: "Non-Kopi", emoji: "🍵", stock: 15,
    desc: "Uji matcha, susu segar", popular: true,
    image: `${IMG}/cb462f6a-5440-4175-bc42-9b2f79e20fdf/_result.png`,
  },
  {
    id: "n2", name: "Cokelat Hazelnut", price: 28000, category: "Non-Kopi", emoji: "🍫", stock: 10,
    desc: "Dark chocolate, krim & hazelnut",
    image: `${IMG}/6f13c7a1-893c-4f00-bb78-d50b1c82b2e9/_result.png`,
  },
  {
    id: "n3", name: "Es Teh Lemon Selasih", price: 15000, category: "Non-Kopi", emoji: "🍋", stock: 30,
    desc: "Teh melati, lemon peras, selasih",
    image: `${IMG}/cb17b4c9-deaa-4cb1-86e7-3ebd3f752bd2/_result.png`,
  },
  {
    id: "m1", name: "Nasi Goreng Senja", price: 28000, category: "Makanan", emoji: "🍛", stock: 8,
    desc: "Telur ceplok, kerupuk, sate ayam", popular: true,
    image: `${IMG}/9425ade2-ad5f-4403-92f9-c38278f9f2a6/_result.png`,
  },
  {
    id: "m2", name: "Mie Goreng Jawa", price: 25000, category: "Makanan", emoji: "🍜", stock: 5,
    desc: "Bumbu kecap, telur, bawang goreng",
    image: `${IMG}/9cc80439-29d0-4607-a1f9-2504f2909c21/_result.png`,
  },
  {
    id: "c1", name: "Butter Croissant", price: 24000, category: "Camilan", emoji: "🥐", stock: 3,
    desc: "Renyah, butter Prancis",
    image: `${IMG}/2d75e29e-e8d0-49ed-ae9b-194ada9532d2/_result.png`,
  },
  {
    id: "c2", name: "Pisang Goreng Keju", price: 20000, category: "Camilan", emoji: "🍌", stock: 2,
    desc: "Keju cheddar parut, susu kental", popular: true,
    image: `${IMG}/871ebaf8-34d5-48d3-afc9-8fcda79d7450/_result.png`,
  },
];

export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

export const CASHIERS: Cashier[] = [
  { id: "ayu", name: "Ayu", color: "#F5C56B" },
  { id: "bima", name: "Bima", color: "#9CC8B2" },
  { id: "citra", name: "Citra", color: "#F0A48E" },
];

export const STORE = {
  name: "Kopi Senja",
  address: "Jl. Purnama No. 12, Yogyakarta",
  phone: "(0274) 555-0123",
};
