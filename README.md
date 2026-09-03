# ☕ Kopi Senja — Aplikasi Kasir (POS) Kedai Kopi

Aplikasi **Point of Sale** satu-halaman untuk kedai kopi, dibangun dengan **React + TypeScript + Vite + Tailwind CSS v4**. Antarmuka berbahasa Indonesia, data tersimpan di `localStorage`, dan siap dipakai langsung tanpa backend.

![Status](https://img.shields.io/badge/status-aktif-1E4D3B)
![React](https://img.shields.io/badge/React-18-149ECA)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8)
![Lisensi](https://img.shields.io/badge/lisensi-MIT-F0A82D)

---

## ✨ Fitur

### 🧾 Transaksi Kasir
- **Katalog 10 menu berfoto asli** (kopi, non-kopi, makanan, camilan) dengan pencarian & filter kategori
- **Keranjang pesanan**: ubah jumlah, hapus item, kosongkan — tersimpan otomatis walau halaman dimuat ulang
- **Diskon bertahap** (kelipatan 5%) dan **PPN 10%** yang dihitung otomatis
- **Pembayaran** Tunai (uang cepat + kembalian otomatis), **QRIS** (kode QR dinamis), dan **Kartu Debit**
- **Struk thermal** ala kertas 80 mm: bisa **dicetak** (`window.print`) atau **diunduh sebagai PDF** (jsPDF)
- **Mode Dine-in / Takeaway** — nomor meja wajib untuk dine-in dan tercetak di struk

### 🗂️ Manajemen Stok
- Stok **berkurang otomatis** setiap pembayaran berhasil dan tersimpan permanen
- Kartu menu menampilkan sisa stok (hijau/emas/merah) dan stempel **“HABIS”** saat nol — item habis tidak bisa dijual
- Panel **Stok** khusus: atur stok per item (stepper / ketik langsung), isi ulang per item, atau **isi ulang semua** (dilindungi PIN), lengkap dengan angka *terjual* dari riwayat

### 👥 Multi-Kasir
- Tiga kasir (Ayu, Bima, Citra) dapat diganti dari header — nama kasir tercatat di setiap transaksi & struk
- Chip **omzet hari ini** di header diperbarui langsung setiap transaksi

### 🔐 Otorisasi Manajer (PIN)
Aksi sensitif wajib PIN (PIN demo: **`2468`**), dengan keypad numerik di layar + dukungan keyboard fisik:
- Diskon di atas **20%**
- **Hapus riwayat** transaksi
- **Isi ulang semua stok**
- **Reset seluruh data**

PIN dapat diganti lewat **Pengaturan** (ikon gerigi).

### 📊 Riwayat & Laporan
- Statistik harian: pendapatan, jumlah transaksi, item terjual, rata-rata nota
- **Grafik pendapatan per jam** (hari ini), **grafik 7 hari terakhir**, dan **donat metode pembayaran** — via Recharts
- **Produk terlaris** sepanjang waktu dengan bilah peringkat
- Buku transaksi dengan filter **Dine-in / Takeaway**, buka ulang struk kapan pun
- **Ekspor CSV** (pemisah `;` + BOM UTF-8 — langsung rapi di Excel locale Indonesia)

---

## 🚀 Memulai

```bash
npm install     # pasang dependensi
npm run dev     # server pengembangan → http://localhost:5173
npm run build   # build produksi → dist/
```

> **PIN manajer demo: `2468`** · Nomor nota berjalan: `SJA-0001`, `SJA-0002`, …

## 🧮 Rumus Perhitungan

```
Diskon   = subtotal × diskon%
PPN      = (subtotal − diskon) × 10%
Total    = subtotal − diskon + PPN
Kembalian = uang tunai − total          (pembayaran tunai saja)
```

Seluruh pembulatan memakai `Math.round` dalam rupiah penuh.

## 🗄️ Penyimpanan (`localStorage`)

| Kunci | Isi |
|---|---|
| `senja-pos:cart` | Keranjang aktif |
| `senja-pos:transactions` | Riwayat (maks. 200) |
| `senja-pos:seq` | Sekuens nomor nota |
| `senja-pos:stock` | Stok berjalan per menu |
| `senja-pos:cashier` | Kasir aktif |
| `senja-pos:pin` | PIN manajer |

## 🗂️ Struktur Proyek

```
src/
├── App.tsx                 # State global & orkestrasi
├── types.ts                # Model data (Product, Transaction, …)
├── data/products.ts        # Katalog menu, kasir, konstanta
├── lib/
│   ├── format.ts           # Rupiah, tanggal, util localStorage
│   └── export.ts           # Ekspor CSV & struk PDF (jsPDF)
└── components/
    ├── Header.tsx          # Navigasi, pemilih kasir, omzet live
    ├── ProductGrid.tsx     # Katalog berfoto + badge stok
    ├── CartPanel.tsx       # Pesanan, dine-in/takeaway, total
    ├── PaymentModal.tsx    # Tunai / QRIS / Kartu Debit
    ├── ReceiptModal.tsx    # Struk (cetak + PDF)
    ├── StockView.tsx       # Manajemen stok
    ├── HistoryView.tsx     # Grafik & buku transaksi
    ├── ManagerModals.tsx   # PIN manajer & pengaturan
    ├── Toast.tsx           # Notifikasi
    └── icons.tsx           # Ikon SVG kustom
```

## 🎨 Kustomisasi Cepat

- **Menu & harga** → `src/data/products.ts` (array `PRODUCTS`, field `stock` = stok awal)
- **Kasir** → array `CASHIERS` di file yang sama
- **PPN / nama toko** → `TAX_RATE` dan `STORE`
- **Warna & font** → blok `@theme` di `src/index.css`

## 📚 Dokumen Proyek

| Dokumen | Isi |
|---|---|
| [BRD](docs/01-BRD.md) | Kebutuhan bisnis, tujuan, KPI, risiko |
| [PRD](docs/02-PRD.md) | Persona, user journey, user stories, MoSCoW |
| [FRD](docs/03-FRD.md) | Spesifikasi fungsional & aturan hitung |
| [TRD](docs/04-TRD.md) | Arsitektur, skema data, design token |

## 🛣️ Roadmap

- [ ] Login kasir per sesi & shift
- [ ] Integrasi pembayaran QRIS statis (NMID merchant)
- [ ] Sinkronisasi cloud (Supabase sudah terpasang sebagai dependensi)
- [ ] Mode offline-first dengan antrian sinkronisasi

## 📄 Lisensi

MIT — bebas dipakai dan dimodifikasi untuk keperluan apa pun.

*Dibuat dengan ☕ oleh tim Kopi Senja.*
