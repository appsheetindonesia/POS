/**
 * Kebijakan bisnis — satu sumber untuk semua angka aturan.
 * UI dan logika membaca konstanta ini, tidak pernah menyalin angkanya.
 */

/** PPN 10% */
export const TAX_RATE = 0.1;

/** PIN manajer bawaan (saat pertama kali / setelah reset) */
export const DEFAULT_PIN = "2468";

/** Awalan nomor nota */
export const INVOICE_PREFIX = "SJA";

/** Jumlah digit angka urut nota, mis. SJA-0001 */
export const INVOICE_DIGITS = 4;

/** Riwayat transaksi tersimpan maksimal (FIFO) */
export const HISTORY_LIMIT = 200;

/** Diskon di atas persentase ini wajib otorisasi manajer */
export const DISCOUNT_APPROVAL_PCT = 20;

/** Batas atas diskon yang dapat dipilih */
export const MAX_DISCOUNT_PCT = 100;

/** Stok ≤ nilai ini dianggap "menipis" */
export const STOCK_LOW = 5;

/** Stok ≤ nilai ini ditandai kritis (merah) */
export const STOCK_CRITICAL = 2;

/** Batas atas angka stok yang bisa diinput */
export const MAX_STOCK = 999;

/** Kasir bawaan saat aplikasi pertama dibuka */
export const DEFAULT_CASHIER_ID = "ayu";

/** Jumlah shift yang disimpan di riwayat (FIFO) */
export const SHIFT_HISTORY_LIMIT = 50;

/** Jumlah pesanan parkir maksimal */
export const MAX_HELD_ORDERS = 10;

/** Batas antrian tulisan offline yang menunggu sinkron (FIFO, tertua dibuang) */
export const SYNC_QUEUE_LIMIT = 200;

/** Tombstone penghapusan disimpan maksimal (FIFO) sebelum dikirim/dipangkas */
export const DELETION_LOG_LIMIT = 500;
