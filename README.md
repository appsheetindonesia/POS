<div align="center">

# ☕ Kopi Senja — POS Kasir Kedai Kopi

**Aplikasi Point of Sale berbasis web untuk kedai kopi UMKM.**
Satu layar, empat langkah: *pilih menu → sesuaikan → bayar → struk.*

![React](https://img.shields.io/badge/React-18.2-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Offline-first](https://img.shields.io/badge/offline--first-✔-1E4D3B)

</div>

---

Kopi Senja POS menggantikan buku catatan dan kalkulator kasir dengan sistem digital yang berjalan sepenuhnya **offline** di browser — tanpa backend, tanpa akun, tanpa biaya lisensi. Seluruh hitungan (subtotal, diskon, PPN, kembalian) otomatis, setiap transaksi bernomor nota, dan omzet hari berjalan bisa dipantau kapan saja.

## ✨ Fitur Utama

- 📸 **Katalog menu berfoto** — 10 menu dalam 4 kategori (Kopi, Non-Kopi, Makanan, Camilan) dengan foto produk asli, badge *Terlaris*, dan fallback emoji bila offline.
- 🔎 **Cari & filter instan** — pencarian nama/deskripsi + chip kategori, berjalan bersamaan.
- 🧺 **Panel pesanan hidup** — stepper qty, hapus item, kosongkan, diskon 0–100% (kelipatan 5%), badge jumlah beranimasi.
- 💵 **Tiga metode pembayaran** — Tunai (chip uang cepat + keypad + validasi kurang bayar + preview kembalian), QRIS (kode statis merchant), dan Kartu Debit (alur EDC).
- 🧾 **Struk gaya thermal** — nomor nota `SJA-xxxx`, rincian lengkap, barcode, dan tombol **Cetak** yang hanya mencetak struk.
- 📊 **Riwayat & dashboard harian** — omzet, jumlah transaksi, item terjual, rata-rata/transaksi, grafik omzet per jam, dan buka-ulang struk.
- 💾 **Persisten antar-sesi** — keranjang, riwayat (maks. 200), dan nomor nota tersimpan di `localStorage`.
- 📱 **Responsif** — panel kanan di desktop, drawer keranjang di tablet/ponsel.

## 🚀 Mulai Cepat

Prasyarat: **Node.js ≥ 18**.

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan mode pengembangan (http://localhost:5173)
npm run dev

# 3. Build produksi → folder dist/
npm run build

# 4. Cek tipe TypeScript
npm run typecheck
```

> **Catatan:** hasil build adalah situs statis — bisa disajikan dari server mana pun atau dibuka langsung untuk demo.

## ⌨️ Pintasan

| Pintasan | Aksi |
|---|---|
| `Esc` | Tutup modal pembayaran / struk |
| Klik selubung modal | Batal (tutup) |
| Klik kartu menu | Tambah item ke pesanan |

## 🧮 Aturan Perhitungan

```
subtotal    = Σ (harga × qty)
diskon      = round(subtotal × persen / 100)
PPN 10%     = round((subtotal − diskon) × 0,10)
total       = subtotal − diskon + PPN
kembalian   = uang tunai − total            (metode Tunai)
```

Seluruh nilai dalam integer rupiah — tidak ada aritmetika floating-point pada uang.

## 🗂️ Struktur Proyek

```
src/
├─ App.tsx               # state pusat: keranjang, transaksi, modal, toast
├─ types.ts              # kontrak tipe (Product, Transaction, dst.)
├─ index.css             # design token Tailwind v4, keyframes, @media print
├─ data/products.ts      # ⭐ katalog menu, harga, konstanta bisnis
├─ lib/format.ts         # formatter IDR/tanggal + util localStorage
└─ components/
   ├─ Header.tsx         # logo, jam live, switch Kasir ⇄ Riwayat
   ├─ ProductGrid.tsx    # katalog foto + cari + filter
   ├─ CartPanel.tsx      # pesanan + diskon + total + tombol Bayar
   ├─ PaymentModal.tsx   # Tunai · QRIS · Kartu Debit
   ├─ ReceiptModal.tsx   # struk thermal + cetak
   ├─ HistoryView.tsx    # statistik harian + grafik per jam
   ├─ Toast.tsx          # notifikasi ringan
   └─ icons.tsx          # ikon SVG kustom
docs/                    # BRD · PRD · FRD · TRD
```

## 🛠️ Kustomisasi

| Ingin mengubah… | Lokasi |
|---|---|
| Menu, harga, kategori, foto | `src/data/products.ts` → array `PRODUCTS` |
| Tarif pajak, nama kasir, identitas kedai | `src/data/products.ts` → `TAX_RATE`, `CASHIER_NAME`, `STORE` |
| Warna & font (design token) | `src/index.css` → blok `@theme` |
| Batas simpan riwayat (200) | `src/App.tsx` → `confirmPayment` |

## 📄 Dokumen Proyek

Dokumen lengkap rekayasa produk & teknis tersedia di [`docs/`](docs/):

| Dokumen | Isi |
|---|---|
| [BRD](docs/01-BRD.md) | Latar belakang bisnis, tujuan, KPI, ruang lingkup, risiko |
| [PRD](docs/02-PRD.md) | Persona, user journey, user stories, prioritas MoSCoW, roadmap |
| [FRD](docs/03-FRD.md) | Spesifikasi fungsional `FR-01…FR-11`, rumus, edge case |
| [TRD](docs/04-TRD.md) | Arsitektur, skema data, design token, strategi cetak & deploy |

## 🗺️ Roadmap

- **v1.1** — Ekspor riwayat ke CSV · pemilih nama kasir saat buka shift
- **v2.0** — Sinkronisasi cloud multi-perangkat · stok sederhana · loyalitas pelanggan

## 📜 Lisensi

Proyek pembelajaran — bebas digunakan dan dimodifikasi untuk kebutuhan Anda.

---

<div align="center">

*Dibuat dengan React, TypeScript & Tailwind CSS — terima kasih, sampai jumpa di senja berikutnya.* 🌇

</div>
