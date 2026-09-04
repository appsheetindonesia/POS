# Arsitektur — Kopi Senja POS

Catatan struktur hasil *architecture pass*. Bangun fitur berikutnya **dengan** struktur
ini, bukan melawannya: logika murni di `domain/`, satu pemilik state di `store.ts`,
UI presentasional di `components/`, akses data di `lib/storage.ts`.

## Peta modul

```
src/
 ├─ main.tsx                  bootstrap — tempat ErrorBoundary global ditambahkan nanti
 ├─ App.tsx                   KOMPOSISI SAJA: menarik state/aksi dari usePosStore, merender view & modal
 ├─ store.ts                  SATU-SATUNYA pemilik state bisnis + UI + efek persistensi
 ├─ types.ts                  kontrak bersama (skema transaksi, View, CategoryFilter, …)
 ├─ domain/                   LOGIKA MURNI — tanpa React, tanpa storage, tanpa DOM
 │   ├─ sales.ts              rumus total (FR-05.A), buildTransaction, deductStock,
 │   │                        cartQuantities, productSalesTotals (agregasi penjualan)
 │   └─ policy.ts             SEMUA angka kebijakan (pajak, PIN, batas diskon/history/stok)
 ├─ data/products.ts          katalog statis: menu, kasir, identitas toko — bukan kebijakan
 ├─ lib/
 │   ├─ storage.ts            satu-satunya akses localStorage (kunci + load/save/reset)
 │   ├─ format.ts             format uang/tanggal id-ID
 │   └─ export.ts             CSV & struk PDF (jsPDF)
 └─ components/               murni presentasional — terima props, panggil callback
     Header · ProductGrid · CartPanel · PaymentModal · ReceiptModal
     HistoryView · StockView · ManagerModals · Toast · icons
```

## Aturan kepemilikan & arah data

1. **Satu pemilik state: `usePosStore()` di `store.ts`.** Komponen TIDAK memegang state
   bisnis (keranjang, transaksi, stok, kasir, PIN, diskon). Komponen hanya menerima
   props + callback; `App.tsx` adalah satu-satunya pemanggil store.
2. **Aliran data satu arah:** aksi komponen → aksi store → fungsi murni `domain/sales.ts`
   → setState → derivasi `useMemo` (totals, qtyInCart, todayTotal) → render komponen.
3. **UI tidak menghitung:** angka total/nota/stok-terjual dihitung oleh `domain/`
   (`computeTotals`, `productSalesTotals`) lalu dibagikan — HistoryView & StockView
   memakai agregasi yang sama, tidak meng-ulang implementasi.
4. **Kebijakan tidak disalin:** ambang diskon-otorisasi, pajak, PIN default, batas 200
   riwayat, ambang stok, prefix nota hanya ada di `domain/policy.ts`. Komponen mengimpor
   konstantanya.
5. **Persistensi terpusat:** store menulis 6 kunci via `lib/storage.ts`; tidak ada komponen
   yang menyentuh `localStorage` langsung. Kunci didaftarkan satu kali di `LS`.
6. **Denormalisasi tetap di boundary:** `buildTransaction` menyalin nama/harga menu ke
   transaksi agar struk historis stabil walau katalog berubah.

## State & siapa pemiliknya

| State | Pemilik | Keterangan |
|---|---|---|
| cart, discountPct, orderType, table | store | dipakai PaymentModal/CartPanel |
| transactions, seq, stockMap | store | dipakai HistoryView/StockView |
| cashierId, pin | store | dipakai Header/ManagerModals |
| view, query, category | store | dipertahankan saat pindah tab |
| modal terbuka (pay/receipt/pin/settings/drawer), toasts | store | UI sementara |

## Seam untuk fitur berikutnya

- **PostgreSQL/Supabase (A1):** ganti isi `lib/storage.ts` (atau tambah adapter paralel
  `lib/sync.ts`) — pemanggil tetap store; tambahkan antrean tulis offline di store.
- **Shift kasir (B1):** entitas `Shift` baru (id, kasir, modalAwal, buka/tutup) hidup di
  `store.ts` + domain murni untuk laporan selisih di `domain/shift.ts`; arahkan tombol
  ganti kasir agar membuka/menutup shift alih-alih ganti bebas.
- **Hold order + catatan item (B2):** perluas `CartItem` (catatan opsional) & tambah state
  `heldOrders` di store; komponen baru di `components/` presentasional.
- **Void/refund PIN (B3):** aksi di store memakai `requestPin` yang sudah ada; jangan
  menaruh logika void di komponen.
- **Notifikasi stok & target harian (B4/B5):** derivasi di `domain/` + efek store;
  tampilan baru di components.
- **Lazy loading (A3) & ErrorBoundary (C1):** HistoryView/StockView siap di-`React.lazy`
  karena sudah modul terpisah; ErrorBoundary di `main.tsx` membungkus `<App/>`.

## Catatan sengaja (bukan dilupakan)

- **Struk digambar dua kali** — `ReceiptModal` (DOM + print) dan `lib/export.ts`
  `downloadReceiptPdf` (jsPDF). Keduanya membaca data `Transaction` yang sama; renderer
  sengaja dipisah karena target media berbeda. Bila ingin satu sumber, pisahkan model
  baris struk (item/aturan pajak) dan jadikan kedua renderer memakannya.
- **Foto dengan fallback emoji** diulang antara ProductGrid dan CartPanel — perbedaan
  gaya kecil; bila mau digabung, buat `components/ProductImage` dengan prop variant.
- Dependensi runtime hanya 4: `react`, `react-dom`, `recharts`, `jspdf` (yang lain
  dibuang pada architecture pass — jangan tambahkan kembali tanpa dipakai).
