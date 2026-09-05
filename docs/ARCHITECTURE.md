# Arsitektur — Kopi Senja POS

Catatan struktur hasil *architecture pass*. Bangun fitur berikutnya **dengan** struktur
ini, bukan melawannya: logika murni di `domain/`, satu pemilik state di `store.ts`,
UI presentasional di `components/`, akses data di `lib/storage.ts`.

## Peta modul

```
src/
 ├─ main.tsx                  bootstrap + ErrorBoundary global
 ├─ App.tsx                   KOMPOSISI SAJA: menarik state/aksi dari usePosStore, merender view & modal
 ├─ store.ts                  SATU-SATUNYA pemilik state bisnis + UI + efek persistensi
 ├─ types.ts                  kontrak bersama (skema transaksi, View, CategoryFilter, …)
 ├─ domain/                   LOGIKA MURNI — tanpa React, tanpa storage, tanpa DOM
 │   ├─ sales.ts              rumus total (FR-05.A), buildTransaction, deductStock,
 │   │                        cartQuantities, productSalesTotals (agregasi penjualan)
 │   ├─ policy.ts             SEMUA angka kebijakan (pajak, PIN, batas diskon/history/stok)
 │   ├─ leaveGuard.ts         predikat penjaga muat-ulang saat transaksi berjalan
 │   ├─ shift.ts              shift logic: open, close, difference, summary
 │   ├─ holdOrders.ts         hold order summary + age formatting
 │   └─ void.ts               void/refund logic: isVoided, restoredStock, formatVoidLabel
 ├─ data/products.ts          katalog statis: menu, kasir, identitas toko — bukan kebijakan
 ├─ lib/
 │   ├─ storage.ts            satu-satunya akses localStorage (kunci + load/save/reset)
 │   ├─ routes.ts             view ↔ hash URL (#/kasir | #/stok | #/riwayat) — pure
 │   ├─ format.ts             format uang/tanggal id-ID
 │   ├─ export.ts             CSV & struk PDF (jsPDF)
 │   ├─ dbConfig.ts           helper MURNI config Postgres: parse/build/validate (TDD)
 │   └─ api.ts                klien fetch server API (health, status, test, sync, pull)
 ├─ server/                   API jembatan browser ↔ PostgreSQL (Express + pg)
 │   ├─ index.js              endpoint: health, db/status, db/config, db/test-connection,
 │   │                        sync/push, data (pull)
 │   ├─ src/db.js             parseDatabaseUrl, buildConnectionString, testConnection
 │   │                        (pesan error ramah), pool lazy singleton, auto-migration
 │   ├─ migrations/001_init.sql  tabel pos_transactions/pos_stock/pos_shifts/
 │   │                        pos_held_orders/pos_meta (JSONB, idempotent)
 │   └─ Dockerfile            deploy Easypanel (PORT + DATABASE_URL)
 └─ components/               murni presentasional — terima props, panggil callback
     Header · ProductGrid · CartPanel · PaymentModal · ReceiptModal
     HistoryView · StockView · ManagerModals · Toast · icons · ErrorBoundary
     ShiftPanel · HeldOrdersDrawer · VoidModal · DatabaseSettings
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
| ingredientMap | store | sumber kebenaran stok bahan; stok menu TURUNAN via resep |
| view, query, category | store | dipertahankan saat pindah tab |
| modal terbuka (pay/receipt/pin/settings/drawer), toasts | store | UI sementara |

## Seam untuk fitur berikutnya

- **PostgreSQL (A1):** DIPASANG — `server/` (Express + pg) jembatan browser→Postgres;
  menu Pengaturan → Database PostgreSQL (mode lokal/server, form koneksi, Uji Koneksi,
  Simpan & Aktifkan, Sinkronkan Sekarang, Ambil dari Server). Konfigurasi via env
  `DATABASE_URL` (Easypanel) atau file `server/data/db-config.json`. Migrasi SQL
  otomatis saat pertama konek. Pola diambil dari project Accounting-Software.
  **Sinkronisasi conflict-aware (LWW per entitas):** setiap tulisan Transaction/Shift/
  HeldOrder/stok membawa `updatedAt` (epoch ms); server (`/api/sync/ops`) menerima
  upsert hanya bila stamp-nya lebih baru, dan penghapusan dicatat sebagai tombstone
  (`pos_deletions`, GC 30 hari) agar perangkat lain tidak menghidupkan kembali data
  yang sudah dihapus. Tulisan offline masuk **antrian sinkron** (`senja-pos:syncQueue`,
  digabung per key saat flush, maks. 200 op) dan otomatis terkirim saat server
  kembali terjangkau (event `online` + interval 30 dtk), lalu data server ditarik
  dan **digabung LWW** (`domain/sync.ts` `mergeServerData`, 17 tests) — bukan penimpaan
  menyeluruh. Stamp stok per product key di `senja-pos:stockStamp`; tombstone lokal di
  `senja-pos:deletions` melindungi pull dari menghidupkan kembali penghapusan yang
  belum terkirim. Tradeoff LWW standar: perangkat dengan jam meleset dapat menimpa
  tulisan lebih baru; resolusi konflik per-field tidak dilakukan.
- **Shift kasir (B1):** SUDAH DIPASANG — `Shift` entity di `types.ts`, logika murni
  di `domain/shift.ts` (7 tests), state di `store.ts`, UI di `components/ShiftPanel.tsx`.
  Transaksi ditandai `shiftId`. Tinggal laporan shift di Riwayat view.
- **Hold order + catatan item (B2):** SUDAH DIPASANG — `CartItem` punya `note`,
  `HeldOrder` entity di `types.ts`, logika di `domain/holdOrders.ts` (5 tests),
  state di `store.ts`, UI di `CartPanel` (note input + parkir button) dan
  `HeldOrdersDrawer.tsx`.
- **Void/refund PIN (B3):** SUDAH DIPASANG — Transaction punya `voided`/`voidedAt`/`voidedBy`/`voidReason`,
  logika di `domain/void.ts` (8 tests), aksi `voidTransaction` di `store.ts` dengan PIN gate,
  UI di `VoidModal.tsx` + tombol void di `HistoryView`.
- **Notifikasi stok & target harian (B4/B5):** derivasi di `domain/` + efek store;
  tampilan baru di components.
- **Stok berbasis bahan baku (resep):** SUDAH DIPASANG — `Ingredient`/`RecipeLine`
  di `types.ts`, katalog 22 bahan + resep 10 menu di `data/products.ts`, logika murni
  di `domain/recipe.ts` (`derivedServings`, `computeEffectiveStockMap`,
  `ingredientsForCart`, `restoredIngredients`; 14 tests). **Bahan adalah satu-satunya
  angka yang disimpan** — stok menu dihitung dari resep (bahan habis = porsi habis).
  Penjualan memotong bahan per resep (`confirmPayment`), void mengembalikannya.
  Bahan ikut sinkron LWW sebagai entitas `ingredients`. Menu tanpa resep (tidak ada
  saat ini) tetap pakai stok langsung — kompatibel mundur. UI: section Bahan Baku
  di Stok + baris resep per menu.
- **Lazy loading (A3) & ErrorBoundary (C1):** SUDAH DIPASANG — HistoryView/StockView
  lazy via `React.lazy` + `Suspense`; ErrorBoundary di `main.tsx` membungkus `<App/>`.
  View berpindah tab kini tersinkron hash URL + tombol back browser (C2, lib/routes.ts);
  refresh saat transaksi berjalan dilindungi beforeunload (C3, domain/leaveGuard.ts).

## Catatan sengaja (bukan dilupakan)

- **Struk digambar dua kali** — `ReceiptModal` (DOM + print) dan `lib/export.ts`
  `downloadReceiptPdf` (jsPDF). Keduanya membaca data `Transaction` yang sama; renderer
  sengaja dipisah karena target media berbeda. Bila ingin satu sumber, pisahkan model
  baris struk (item/aturan pajak) dan jadikan kedua renderer memakannya.
- **Foto dengan fallback emoji** diulang antara ProductGrid dan CartPanel — perbedaan
  gaya kecil; bila mau digabung, buat `components/ProductImage` dengan prop variant.
- Dependensi runtime hanya 4: `react`, `react-dom`, `recharts`, `jspdf` (yang lain
  dibuang pada architecture pass — jangan tambahkan kembali tanpa dipakai).
