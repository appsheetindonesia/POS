# TRD — Technical Requirements Document

## Aplikasi Kasir (POS) "Kopi Senja"

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Mengacu pada** | FRD v1.0 (FR-01 s.d. FR-11) |
| **Status** | Implementasi selesai — dokumen ini memotret arsitektur terpasang |

---

## 1. Stack Teknologi

| Lapisan | Pilihan | Versi | Alasan |
|---|---|---|---|
| Bahasa | TypeScript | 5.7 | Tipe statis untuk skema transaksi & harga |
| UI Library | React | 18.2 | Ekosistem, hooks, tanpa runtime berat |
| Build tool | Vite | 6.3 | Dev server instan, output statis |
| Styling | Tailwind CSS | 4.1 (plugin `@tailwindcss/vite`) | Design token via `@theme`, tanpa CSS-in-JS |
| Font | Fraunces · Instrument Sans · Spline Sans Mono | — | Display / body / angka tabular |
| State | React `useState` + `useMemo` | — | Skala aplikasi 1 layar; library state global tidak diperlukan |
| Persistensi | `localStorage` | — | Offline-first, tanpa backend (FR-08) |
| Dependensi runtime tambahan | **Tidak ada** | — | Bundle ringkas; seluruh Ikon SVG digambar tangan |

> Foto produk di-host eksternal; komponen gambar memiliki fallback emoji sehingga kegagalan jaringan tidak merusak fungsi (FR-01.5).

## 2. Arsitektur & Alur Data

Aplikasi **SPA satu halaman, dua tampilan** (Kasir, Riwayat) dengan data flow unidirectional: seluruh state transaksi hidup di `App` (component-level store) dan diturunkan sebagai props.

```
App (state: view, cart, discountPct, transactions, seq, modals, toasts)
 ├─ Header            ← view, jam digital, jumlah item
 ├─ Tampilan Kasir
 │   ├─ ProductGrid   ← query, category, qtyInCart; → onAdd
 │   └─ CartPanel     ← items, totals; → onQty/onRemove/onClear/onPay
 ├─ Tampilan Riwayat
 │   └─ HistoryView   ← transactions; → onOpenReceipt
 ├─ PaymentModal      ← totals; → confirmPayment(method, cash)
 ├─ ReceiptModal      ← tx (hasil bayar / dari riwayat)
 └─ Toasts            ← toasts[]
```

**Aturan arsitektur**

- **Single source of truth:** hanya `App` yang memmutasi `cart`, `transactions`, dan `seq`. Anak komponen murni presentasional (menerima props + callback).
- **Derived state via `useMemo`:** `qtyInCart` (peta productId → qty) dan `totals` (rumus FR-05.A) dihitung ulang hanya saat `cart`/`discountPct` berubah.
- **Pemisahan concern:** `data/` = katalog statis · `lib/` = formatter & util storage · `components/` = UI · `types.ts` = kontrak tipe bersama.

## 3. Model Data

Definisi lengkap di `src/types.ts`.

```ts
type Category = "Kopi" | "Non-Kopi" | "Makanan" | "Camilan";

interface Product {
  id: string;          // stabil, contoh "k1"
  name: string;
  price: number;       // integer rupiah
  category: Category;
  image: string;       // URL foto produk
  emoji: string;       // fallback offline
  desc: string;
  popular?: boolean;   // badge "Terlaris"
}

interface CartItem { productId: string; qty: number }      // qty ≥ 1

type PaymentMethod = "Tunai" | "QRIS" | "Kartu Debit";

interface Transaction {
  id: string;                // `${Date.now()}-${seq}`
  invoice: string;           // "SJA-" + seq.padStart(4,"0")
  timestamp: number;         // epoch ms
  cashier: string;           // konstanta "Ayu" (v1)
  lines: { name: string; qty: number; price: number }[];
  itemCount: number;         // Σ qty
  subtotal: number;
  discountPct: number;       // 0–100
  discountAmt: number;
  tax: number;               // 10% dari (subtotal − discountAmt)
  total: number;
  method: PaymentMethod;
  cash: number | null;       // hanya Tunai
  change: number | null;     // hanya Tunai
}
```

**Keputusan desain:** `Transaction` menyalin `name` dan `price` dari produk (denormalisasi), bukan menyimpan referensi id — struk historis harus tetap benar walau katalog/harga diubah di versi berikutnya.

**Konstanta bisnis** (`src/data/products.ts`): `TAX_RATE = 0.1`, `CASHIER_NAME = "Ayu"`, identitas kedai `STORE`.

## 4. Persistensi (localStorage)

| Kunci | Tipe | Isi | Default |
|---|---|---|---|
| `senja-pos:cart` | `CartItem[]` | Keranjang aktif | `[]` |
| `senja-pos:transactions` | `Transaction[]` | Maks. 200, terbaru di depan | `[]` |
| `senja-pos:seq` | `number` | Nomor nota berikutnya | `1` |

- Tulis: `useEffect` pada tiap perubahan state (sinkron, fire-and-forget, `try/catch`).
- Baca: sekali saat inisialisasi state melalui `loadLS()` dengan fallback aman terhadap JSON korup (FR-08.3).
- Batas 200 transaksi diterapkan saat `confirmPayment` memotong array.

## 5. Struktur Proyek

```
├─ index.html                  # shell + judul + preload font
├─ src/
│  ├─ main.tsx                 # bootstrap React
│  ├─ App.tsx                  # store + orkestrasi tampilan & modal
│  ├─ types.ts                 # seluruh kontrak tipe
│  ├─ index.css                # @theme token, keyframes, scrollbar, @media print
│  ├─ data/products.ts         # katalog 10 menu, kategori, konstanta bisnis
│  ├─ lib/format.ts            # Intl id-ID (IDR, tanggal), parseDigits, loadLS/saveLS
│  └─ components/
│     ├─ Header.tsx            # logo, jam live, switch Kasir/Riwayat
│     ├─ ProductGrid.tsx       # katalog foto + cari + filter + fallback emoji
│     ├─ CartPanel.tsx         # panel pesanan gelap + stepper diskon + total
│     ├─ PaymentModal.tsx      # tab Tunai/QRIS/Kartu + keypad + validasi
│     ├─ ReceiptModal.tsx      # struk thermal + barcode + cetak
│     ├─ HistoryView.tsx       # statistik, grafik per jam, ledger
│     ├─ Toast.tsx             # tumpukan notifikasi
│     └─ icons.tsx             # ±20 ikon SVG kustom (stroke 2)
└─ docs/                       # BRD · PRD · FRD · TRD · (README di akar)
```

## 6. Sistem Desain (Design Tokens)

Didefinisikan di `src/index.css` blok `@theme` Tailwind v4 → tersedia sebagai utility class.

| Token | Nilai | Fungsi |
|---|---|---|
| `--color-ink` | `#14231C` | Teks & latar gelap aksen |
| `--color-pine` / `pine-deep` | `#1E4D3B` / `#163A2C` | Primer; panel pesanan |
| `--color-gold` | `#F0A82D` | Aksen aksi utama (Bayar, total) |
| `--color-paper` / `card` / `milk` | `#F1F3E9` / `#FBFCF6` / `#F5F1E4` | Latar, kartu, teks di panel gelap |
| `--color-tomato` | `#D1502C` | Semantik bahaya / kurang bayar |
| `--font-display` `--font-body` `--font-mono` | Fraunces / Instrument Sans / Spline Sans Mono | Hierarki tipografi |
| `--shadow-lift` `--shadow-deep` | — | Elevasi kartu & modal |
| Keyframes | `fade-up, pop, slide-in, drop, badge, steam, shimmer` | Umpan balik gerak (FR-09, FR-01.5) |

**Pola visual:** latar kertas hangat + tekstur titik radial; panel pesanan hijau gelap bertekstur garis diagonal; struk memakai font mono + tepi perforasi (`radial-gradient` berulang).

## 7. Format & Lokalisasi

- Mata uang: `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })` → `Rp 24.000`. Seluruh kalkulasi integer; tidak ada aritmetika float pada uang.
- Tanggal/waktu: locale `id-ID` (`Senin, 3 Februari 2026`, `14.05.32`), zona waktu perangkat (ditampilkan berlabel "WIB" sebagai konvensi kedai).
- Jam header: `setInterval` 1 detik, dibersihkan saat unmount.

## 8. Strategi Cetak

- Struk dibungkus elemen berkelas `.receipt-area`.
- `@media print` (di `index.css`): `visibility: hidden` pada `body *`, lalu `visibility: visible` pada `.receipt-area` yang diposisikan `fixed inset-0` — hanya struk yang keluar ke kertas, termasuk dari modal yang sedang terbuka.
- Tombol cetak memanggil `window.print()`; kelas `.no-print` menyembunyikan aksi saat mencetak.

## 9. Kualitas & Pengujian

| Jenis | Cakupan |
|---|---|
| **Kompilasi** | `npm run build` (Vite + `tsc`) wajib lolos tanpa error |
| **Checklist manual** | (1) tambah/kurang/hapus item & diskon → angka konsisten dengan rumus FR-05.A; (2) tunai kurang → konfirmasi terkunci; uang pas → kembalian 0; (3) refresh saat keranjang terisi → data utuh; (4) 3 transaksi → nota `SJA-0001..0003`, statistik harian benar; (5) cetak → hanya struk yang tercetak; (6) viewport 375 px → drawer berfungsi |
| **Ambang performa** | Bundle ≤ 200 KB gzip (terukur: ≈ 60 KB gzip), LCP didominasi foto eksternal |

## 10. Batasan Teknis & Jalan Evolusi

| Batasan v1 | Evolusi yang disiapkan |
|---|---|
| Penyimpanan per-browser (tanpa sync) | Lapisan akses data (`loadLS/saveLS`) terisolasi → mudah diganti adapter API/Supabase |
| Satu kasir hardcoded ("Ayu") | Field `cashier` sudah ada di skema → tinggal tambah pemilih saat buka shift |
| QRIS statis, konfirmasi manual | Integrasi payment gateway menggantikan `PaymentModal` tab QRIS |
| Foto di-host eksternal | Unduh ke `public/images/` untuk offline 100% (fallback emoji sudah mengamankan) |
