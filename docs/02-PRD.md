# PRD — Product Requirements Document

## Aplikasi Kasir (POS) "Kopi Senja"

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Mengacu pada** | BRD v1.0 (BR-01 s.d. BR-07) |
| **Status** | Disetujui untuk Pengembangan |

---

## 1. Ringkasan Produk

**Kopi Senja POS** adalah aplikasi kasir berbasis web untuk kedai kopi UMKM. Satu layar menampilkan seluruh alur kerja kasir: katalog menu di kiri, panel pesanan di kanan. Alur inti hanya empat langkah — **pilih menu → sesuaikan pesanan → bayar → struk** — dan seluruh hitungan (subtotal, diskon, PPN, kembalian) dilakukan otomatis oleh sistem. Riwayat transaksi hari berjalan tersedia di tab terpisah lengkap dengan ringkasan omzet.

**Proposisi nilai:** kasir bekerja lebih cepat dan tanpa salah hitung; pemilik mendapat angka penjualan real-time; semua berjalan offline di perangkat yang sudah ada.

## 2. Persona Pengguna

### 2.1 Ayu — Kasir (Pengguna Utama)

- 22 tahun, bekerja shift pagi–sore, melayani 60–100 transaksi/hari.
- **Kebutuhan:** layar yang bisa dibaca sambil melayani pelanggan, hitungan otomatis, kembalian pasti benar, struk cepat.
- **Hambatan saat ini:** salah kembalian saat ramai; lupa mencatat pesanan yang terburu-buru.

### 2.2 Pak Senja — Pemilik Kedai

- 45 tahun, memantau kedai dari rumah / ponsel.
- **Kebutuhan:** angka omzet hari ini, jumlah transaksi, menu apa yang paling laku.
- **Hambatan saat ini:** menunggu rekap manual malam hari yang sering terlambat/salah.

## 3. User Journey (Skenario Utama)

```
Pelanggan memesan
      │
      ▼
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐
│ 1. Pilih     │──▶│ 2. Sesuaikan  │──▶│ 3. Bayar     │──▶│ 4. Struk     │
│ menu (foto,  │   │ qty / diskon /│   │ Tunai / QRIS │   │ tampil &     │
│ kategori,    │   │ kosongkan     │   │ / Kartu      │   │ dicetak      │
│ cari)        │   │               │   │              │   │              │
└─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘
                                                              │
                                                              ▼
                                              Tersimpan di Riwayat
                                              (omzet ter-update)
```

**Titik umpan balik di setiap langkah:** toast "menu masuk pesanan", badge jumlah pada kartu menu, angka total yang bergerak di panel kanan, animasi sukses pada pembayaran.

## 4. Fitur & Prioritas (MoSCoW)

| ID | Fitur | Deskripsi Singkat | Prioritas | Rujukan FRD |
|---|---|---|---|---|
| F-01 | Katalog menu berfoto | 10 menu dalam 4 kategori, foto produk asli, badge "Terlaris" | **Must** | FR-01 |
| F-02 | Pencarian & filter kategori | Cari nama/deskripsi + chip kategori dengan jumlah item | **Must** | FR-02 |
| F-03 | Panel pesanan (keranjang) | Tambah/kurangi qty, hapus item, kosongkan, badge jumlah | **Must** | FR-03 |
| F-04 | Diskon persentase | Stepper 0–100% kelipatan 5, memengaruhi pajak & total | **Should** | FR-04 |
| F-05 | Pembayaran multi-metode | Tunai (uang cepat + keypad & validasi kurang bayar), QRIS (kode statis + konfirmasi), Kartu Debit (konfirmasi EDC) | **Must** | FR-05 |
| F-06 | Struk digital + cetak | Struk gaya thermal, nomor nota, barcode dekoratif, tombol cetak (`window.print`) | **Must** | FR-06 |
| F-07 | Riwayat & ringkasan harian | Daftar transaksi (maks. 200), statistik hari ini, grafik omzet per jam, buka-ulang struk, hapus riwayat | **Must** | FR-07 |
| F-08 | Penyimpanan persisten | Keranjang, riwayat, dan nomor nota bertahan antar-sesi via localStorage | **Must** | FR-08 |
| F-09 | Notifikasi toast | Konfirmasi aksi (tambah, hapus, sukses bayar) tanpa memutus alur | **Should** | FR-09 |
| F-10 | Responsif desktop–tablet–ponsel | Drawer keranjang pada layar kecil, panel kanan pada layar besar | **Should** | FR-10 |
| F-11 | Mode offline penuh | Tanpa dependensi runtime eksternal; foto produk fallback emoji | **Could** | FR-08 |
| F-12 | Login multi-pengguna, stok, cloud sync | — | **Won't** (v1) | — |

## 5. User Stories & Kriteria Penerimaan

### US-01 — Menambah menu ke pesanan *(F-01, F-03)*
> *Sebagai kasir, saya ingin mengetuk kartu menu agar item langsung masuk pesanan, sehingga saya tidak perlu mengetik apa pun.*

**Kriteria penerimaan:**
- [ ] Ketukan pada kartu menambah qty 1 (atau menambah qty item yang sudah ada).
- [ ] Badge `×n` pada kartu menu dan angka pada panel pesanan ikut ter-update dengan animasi.
- [ ] Toast konfirmasi muncul dan hilang otomatis dalam 2,4 detik.

### US-02 — Menyesuaikan pesanan *(F-03, F-04)*
> *Sebagai kasir, saya ingin mengubah jumlah atau menghapus item saat pelanggan berubah pikiran, tanpa mengulang pesanan dari awal.*

**Kriteria penerimaan:**
- [ ] Tombol −/+ mengubah qty; qty yang mencapai 0 otomatis menghapus baris.
- [ ] Tombol hapus per baris dan "Kosongkan" untuk seluruh pesanan (reset diskon ke 0%).
- [ ] Total, PPN, dan diskon terhitung ulang seketika.

### US-03 — Menerima pembayaran tunai *(F-05)*
> *Sebagai kasir, saya ingin memilih nominal uang cepat atau mengetik di keypad, lalu sistem menampilkan kembalian yang benar.*

**Kriteria penerimaan:**
- [ ] Nominal cepat (uang pas, Rp 10.000 s.d. Rp 100.000) dapat dipilih satu ketukan.
- [ ] Keypad menyetor digit ke bidang "Uang Diterima"; tombol ⌫ menghapus digit terakhir.
- [ ] Tombol konfirmasi **terkunci** selama uang < total; pesan "Kurang Rp X" tampil saat kurang.
- [ ] Setelah sukses: kembalian tampil besar, riwayat bertambah, keranjang kosong, struk terbuka.

### US-04 — Menerima QRIS / Kartu *(F-05)*
> *Sebagai kasir, saya ingin menampilkan kode QRIS atau menunggu konfirmasi EDC, lalu menandai transaksi lunas.*

**Kriteria penerimaan:**
- [ ] Tab QRIS menampilkan kode statis + nilai tagihan yang benar.
- [ ] Konfirmasi hanya dapat dilakukan setelah menekan "Pelanggan sudah scan & bayar".
- [ ] Tab Kartu Debit menampilkan alur EDC (gesek/chip → PIN → sukses) dengan tombol konfirmasi.

### US-05 — Mencetak struk *(F-06)*
> *Sebagai pelanggan, saya ingin menerima struk yang jelas: daftar item, harga, pajak, diskon, dan metode bayar.*

**Kriteria penerimaan:**
- [ ] Struk memuat: nama & alamat kedai, nomor nota `SJA-xxxx`, tanggal-waktu, kasir, rincian item (qty × harga), subtotal, diskon (jika ada), PPN 10%, total, metode, tunai & kembalian (jika tunai).
- [ ] Tombol "Cetak Struk" hanya mencetak area struk (CSS `@media print`).

### US-06 — Memantau penjualan harian *(F-07)*
> *Sebagai pemilik, saya ingin melihat omzet hari ini, jumlah transaksi, dan jam tersibuk tanpa menunggu rekap.*

**Kriteria penerimaan:**
- [ ] Kartu statistik: omzet hari ini, jumlah transaksi, item terjual, rata-rata per transaksi.
- [ ] Grafik batang omzet per jam (07.00–21.00) dengan tooltip nilai.
- [ ] Setiap baris transaksi dapat membuka ulang struknya (mode lihat-saja).

### US-07 — Kehilangan koneksi / sesi *(F-08, F-11)*
> *Sebagai kasir, saya ingin pekerjaan saya tidak hilang saat halaman termuat ulang atau internet mati.*

**Kriteria penerimaan:**
- [ ] Keranjang yang belum dibayar tetap ada setelah refresh.
- [ ] Riwayat dan nomor nota berikutnya bertahan antar-sesi.
- [ ] Jika foto produk gagal dimuat, kartu menu menampilkan fallback emoji.

## 6. Persyaratan UX & Desain

| Aspek | Ketentuan |
|---|---|
| **Identitas** | Palet hijau pinus + emas ("senja di kebun kopi"); latar kertas hangat bertekstur titik |
| **Tipografi** | Display: *Fraunces* (serif berkarakter) · Body: *Instrument Sans* · Angka/nota: *Spline Sans Mono* (tabular) |
| **Gerak** | Umpan balik di tiap aksi: fade-up kartu, pop modal, slide-in toast, badge memantul saat qty berubah |
| **Status kosong** | Keranjang, hasil pencarian, dan riwayat memiliki ilustrasi + ajakan bertindak masing-masing |
| **Aksesibilitas** | Label `aria` pada tombol ikon, kontras teks mematuhi WCAG AA, fokus keyboard pada input |

## 7. Persyaratan Non-Fungsional

| Kode | Persyaratan | Target |
|---|---|---|
| NFR-1 | Waktu muat awal (bundle JS) | < 200 KB gzip |
| NFR-2 | Respons aksi UI (tambah item, ganti tab) | < 100 ms |
| NFR-3 | Akurasi perhitungan | Integer rupiah, pembulatan `Math.round` |
| NFR-4 | Dukungan browser | Chrome/Edge/Firefox/Safari 2 tahun terakhir |
| NFR-5 | Ketersediaan offline | 100% fitur inti tanpa jaringan |

## 8. Roadmap Produk

| Rilis | Isi |
|---|---|
| **v1.0 (ini)** | Kasir 1 layar, 3 metode bayar, struk cetak, riwayat harian, persistensi lokal |
| **v1.1** | Ekspor riwayat CSV, multi-kasir dengan nama kasir dipilih saat buka shift |
| **v2.0** | Sinkronisasi cloud (multi-perangkat), manajemen stok sederhana, program loyalitas |
