/**
 * Akses data persisten — satu-satunya modul yang menyentuh localStorage.
 * Ganti implementasi ini (mis. adapter Supabase/PostgreSQL) tanpa menyentuh pemanggil.
 */

export const LS = {
  cart: "senja-pos:cart",
  transactions: "senja-pos:transactions",
  seq: "senja-pos:seq",
  stock: "senja-pos:stock",
  cashier: "senja-pos:cashier",
  pin: "senja-pos:pin",
  shift: "senja-pos:shift",
  shifts: "senja-pos:shifts",
  heldOrders: "senja-pos:heldOrders",
  dbConfig: "senja-pos:dbConfig",
} as const;

export type LSKey = (typeof LS)[keyof typeof LS];

export function load<T>(key: LSKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: LSKey, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

export function removeAllData() {
  Object.values(LS).forEach((k) => localStorage.removeItem(k));
}
