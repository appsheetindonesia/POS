# 05 — Audit Anti-Slop · Kopi Senja POS

Audit terhadap aplikasi menggunakan kerangka **[anti-slop](https://github.com/miqdadbadjuber/anti-slop)** —
filter aturan untuk menyaring UI/teks "AI slop" (generik, terasa buatan AI) tanpa membuat hasil
menjadi steril. Mode pakai: **AFTER** (audit hasil jadi → daftar temuan bernomor → perbaikan → laporan).

Anti-slop bukan panduan gaya: tidak ada warna/font/layout yang diwajibkan. Ia menolak
*teknik tanpa alasan* dan mewajibkan *kehidupan* (liveliness). Arahan desain proyek ini
(palet senja kopi, Fraunces + Instrument Sans + Spline Sans Mono) berperan sebagai `DESIGN.md`.

---

## A. Design Read

- **Subjek**: mesin kasir kedai kopi sore hari. Yang paling khas: struk thermal, stempel,
  angka monospasi, cahaya senja — bukan hero landing page.
- **Palet**: hijau pinus + emas + kertas, aksen tomat untuk bahaya. Bukan indigo/violet,
  bukan near-black + neon, bukan krem-terakota.
- **Tipografi**: display *Fraunces* (italic, hitam) vs body *Instrument Sans* vs angka
  *Spline Sans Mono* tabular — kontras ukuran ekstrem (10px micro-caps ↔ 54px angka pendapatan).

## B. Temuan & Perbaikan

| # | Temuan | Pola slop | Perbaikan | Status |
|---|--------|-----------|-----------|--------|
| F-01 | Latar body memakai **dot grid** | dot-grid (v3.2.1) | Diganti *film grain* (SVG turbulence) + satu cahaya senja directional asimetris | ✅ |
| F-02 | Semua ikon navigasi stroke-tipis seragam | Lucide-style icon set (v3.2.1) | Glyph navigasi (Kasir/Stok/Riwayat) digambar ulang **duotone isi + aksen emas**, kontras dengan ikon utilitas | ✅ |
| F-03 | Strip statistik = **4 kartu seragam** | equal feature-card row | Layout asimetris: satu angka pendapatan dominan (Fraunces 54px) + kartu satelit (jam tersibuk, metode utama) | ✅ |
| F-04 | Eyebrow `tracking-widest` "POINT OF SALE" | AI eyebrow | Diganti info fungsional: tanggal hari ini + "Meja Kasir 01" | ✅ |
| F-05 | Radius seragam `rounded-2xl` di semua elemen | blanket rounded-2xl | Hierarki radius bertoken: `pill` (chip) / `stamp` 10px (aksi & input) / `card` 18px / `panel` 26px | ✅ |
| F-06 | Tidak ada indikator fokus keyboard | antislop-human | `:focus-visible` outline emas global | ✅ |
| F-07 | Animasi mengabaikan reduced-motion | antislop-human | `@media (prefers-reduced-motion)` meredam seluruh animasi | ✅ |
| F-08 | Baris buku transaksi statis | RHYTHM | Stagger `fade-up` per baris (30ms) | ✅ |
| F-09 | Dua radial glow simetris di latar | radial orbs | Satu glow senja (emas→tomat) kanan-atas + refleksi pinus kecil kiri-bawah; asimetris & beralasan (motif "senja") | ✅ |

**Tidak ditemukan (lolos Hard Gate)**: hero trio terpusat · heading gradien · indigo/violet/pink ·
glassmorphism menyeluruh · bento grid · jendela terminal palsu · kolom koran + hairline ·
statistik palsu di UI · harga tiga kolom · demo tanpa produk.

## C. Purpose-Gate (teknik + alasan tertulis)

| Teknik | Alasan |
|--------|--------|
| `backdrop-blur` header | header sticky di atas konten scroll — keterbacaan, bukan estetika |
| Glow emas di kartu pendapatan | memusatkan motif "senja" pada satu angka terpenting; bukan aurora menyebar |
| Pseudo-QR & kode QRIS | produk demo: alur pembayaran harus lengkap tanpa backend pembayaran asli |
| Foto AI untuk menu | konsistensi gaya foto (overhead, meja walnut) yang tidak mungkin didapat dari stok foto gratis |
| `animate-ping` pada chip omzet | penanda data live yang berubah tiap transaksi |

## D. Delivery Gate — PASS/FAIL

| Blok | Hasil | Catatan |
|------|-------|---------|
| **Hard Gate** | **PASS** | 0 pelanggaran pola terlarang |
| **Purpose-Gate** | **PASS** | 5 teknik punya alasan tertulis (tabel C) |
| **Liveliness** | **PASS** | ENERGY: uap logo, badge pop, ping omzet · RHYTHM: stagger grid & ledger · MOTION: zoom foto, goyang PIN salah, transisi state |
| **Craftsmanship & Quality** | **PASS** | hierarki radius bertoken, 3 keluarga font konsisten, fokus keyboard, reduced-motion |

**Keputusan akhir: PASS.** Audit diulang setiap kali ada perubahan UI besar.
