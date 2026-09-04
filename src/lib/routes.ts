import type { View } from "../types";

const VIEWS: readonly View[] = ["kasir", "stok", "riwayat"];

/** View yang dipakai saat hash tidak dikenal / kosong. */
export const DEFAULT_VIEW: View = "kasir";

/** Baca hash browser ("#/riwayat") → view; null bila tidak dikenal. */
export function viewFromHash(hash: string): View | null {
  const v = hash.replace(/^#\//, "");
  return (VIEWS as readonly string[]).includes(v) ? (v as View) : null;
}

/** Hash URL untuk sebuah view. */
export function hashForView(view: View): string {
  return `#/${view}`;
}
