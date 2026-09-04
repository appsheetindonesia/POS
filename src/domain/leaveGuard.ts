/**
 * Predikat penjaga muat-ulang (C3).
 *
 * Keranjang sendiri DIPERSISTENSI (US-07) — refresh biasa tidak kehilangan apa pun
 * dan tidak boleh memunculkan prompt. Guard hanya aktif saat refresh akan
 * menjatuhkan konteks jualan yang BELUM tersimpan: modal pembayaran terbuka,
 * diskon dipakai, atau nomor meja diketik.
 */
export interface RefreshContext {
  cartCount: number;
  payOpen: boolean;
  discountPct: number;
  table: string;
}

export const needsRefreshGuard = (ctx: RefreshContext): boolean =>
  ctx.cartCount > 0 &&
  (ctx.payOpen || ctx.discountPct > 0 || ctx.table.trim().length > 0);