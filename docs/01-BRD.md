# BRD — Business Requirements Document

## Aplikasi Kasir (POS) "Kopi Senja"

| | |
|---|---|
| **Nama Proyek** | Kopi Senja POS |
| **Versi Dokumen** | 1.0 |
| **Status** | Disetujui untuk Pengembangan |
| **Tanggal** | 2026 |
| **Penyusun** | Tim Produk & Teknologi |

---

## 1. Latar Belakang

Kopi Senja adalah kedai kopi skala UMKM di Yogyakarta dengan 10 item menu inti (kopi, non-kopi, makanan berat, dan camilan). Proses pencatatan penjualan saat ini masih manual: pesanan dicatat di kertas, total dihitung dengan kalkulator, dan rekap penjualan harian dilakukan di akhir shift secara manual. Cara ini menimbulkan tiga masalah bisnis:

1. **Selisih kas** — kesalahan hitung kembalian dan total pesanan tidak terdeteksi hingga akhir hari.
2. **Lambatnya antrean** — kasir butuh ±60 detik per transaksi hanya untuk menghitung.
3. **Tidak ada data penjualan** — pemilik tidak dapat mengetahui menu terlaris, jam sibuk, atau omzet harian tanpa rekap manual yang rawan salah.

Aplikasi POS berbasis web ini diajukan untuk menggantikan pencatatan manual tersebut dengan sistem digital yang berjalan di perangkat kasir yang ada (laptop/tablet + browser), tanpa biaya lisensi dan tanpa ketergantungan pada koneksi internet.

## 2. Tujuan Bisnis

| Kode | Tujuan | Target Terukur |
|---|---|---|
| **OBJ-1** | Mempercepat proses transaksi di kasir | Rata-rata ≤ 20 detik dari pesanan masuk hingga struk terbit |
| **OBJ-2** | Menghilangkan kesalahan hitung | 0 selisih kas akibat salah hitung total/kembalian |
| **OBJ-3** | Menyediakan data penjualan real-time | Omzet, jumlah transaksi, dan menu terlaris hari ini dapat dilihat kapan saja |
| **OBJ-4** | Meminimalkan biaya operasional | Rp 0 biaya lisensi; berjalan di perangkat & browser yang sudah dimiliki |

## 3. Ruang Lingkup

### 3.1 Dalam Ruang Lingkup (In-Scope)

- Pencatatan pesanan per transaksi (tambah, ubah jumlah, hapus, kosongkan).
- Perhitungan otomatis subtotal, diskon (%), PPN 10%, dan kembalian tunai.
- Tiga metode pembayaran: **Tunai**, **QRIS**, dan **Kartu Debit**.
- Penerbitan struk digital dengan kemampuan **cetak** melalui printer yang terpasang di perangkat.
- Riwayat transaksi tersimpan di perangkat (persisten antar-sesi) beserta ringkasan harian.
- Antarmuka responsif: dapat dipakai di desktop kasir maupun tablet/ponsel kasir cadangan.

### 3.2 Di Luar Ruang Lingkup (Out-of-Scope)

- Manajemen inventaris & stok bahan baku.
- Sinkronisasi multi-perangkat / multi-outlet (single-device, offline-first).
- Manajemen karyawan, absensi, dan hak akses multi-pengguna.
- Integrasi pembayaran elektronik live (QRIS yang ditampilkan adalah kode statis untuk dipindai di perangkat MDR merchant; tidak ada settlement otomatis).
- Pencatatan pajak pelaporan resmi (PPN ditampilkan sebagai informasi harga jual).

## 4. Pemangku Kepentingan

| Peran | Kepentingan | Frekuensi Penggunaan |
|---|---|---|
| **Pemilik kedai** | Omzet akurat, laporan harian, menu terlaris | Harian (memantau riwayat) |
| **Kasir** | Antrean cepat, hitungan otomatis, struk | Setiap jam operasional |
| **Pelanggan** | Struk jelas, pembayaran fleksibel | Saat transaksi |

## 5. Kebutuhan Bisnis (Business Requirements)

| ID | Kebutuhan | Prioritas | Rujukan Fitur |
|---|---|---|---|
| **BR-01** | Kasir dapat memproses transaksi dari menu hingga struk tanpa alat bantu hitung | Wajib | FR-01 s.d. FR-06 |
| **BR-02** | Setiap transaksi terekam dengan nomor nota unik dan dapat ditelusuri ulang | Wajib | FR-07, FR-08 |
| **BR-03** | Pemilik dapat melihat omzet & volume transaksi hari berjalan kapan saja | Wajib | FR-07 |
| **BR-04** | Data transaksi tidak hilang saat browser/perangkat dimatikan | Wajib | FR-08 |
| **BR-05** | Kasir dapat memberi diskon persentase atas kebijakan promo | Penting | FR-04 |
| **BR-06** | Aplikasi tetap berfungsi tanpa koneksi internet | Penting | FR-08 (offline-first) |
| **BR-07** | Tampilan dapat digunakan pada layar tablet untuk kasir keliling | Pendukung | FR-10 |

## 6. Asumsi & Kendala

**Asumsi**

- Kedai memiliki satu titik kasir aktif per hari kerja.
- Harga jual menu sudah termasuk skema PPN 10% yang dipisahkan pada struk sebagai informasi.
- Pembayaran QRIS dilakukan melalui kode statis merchant; konfirmasi dilakukan manual oleh kasir setelah notifikasi masuk di ponsel.

**Kendala**

- Anggaran pengembangan Rp 0 untuk lisensi perangkat lunak → seluruhnya open-source.
- Penyimpanan menggunakan localStorage browser dengan kuota ±5 MB → riwayat dibatasi 200 transaksi terakhir per perangkat.

## 7. Ukuran Keberhasilan (KPI)

| KPI | Baseline (manual) | Target |
|---|---|---|
| Waktu rata-rata per transaksi | ±60 detik | ≤ 20 detik |
| Selisih kas / hari | ±Rp 10.000–50.000 | Rp 0 dari salah hitung |
| Waktu rekap harian | ±15 menit | 0 (real-time) |
| Ketersediaan aplikasi | — | Berjalan offline 100% jam operasional |

## 8. Risiko Bisnis & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data localStorage terhapus (clear cache) | Kehilangan riwayat | Sosialisasi prosedur ekspor/backup manual; arsip struk cetak |
| Perangkat kasir rusak | Operasional terhenti | Aplikasi web dapat dibuka di perangkat cadangan apa pun |
| Kasir resisten terhadap sistem baru | Adopsi lambat | UI satu layar, alur 4 langkah (pilih → sesuaikan → bayar → struk) |

## 9. Persetujuan

| Peran | Nama | Tanda Tangan | Tanggal |
|---|---|---|---|
| Pemilik Kedai | ________________ | ____________ | __________ |
| Penanggung Jawab Teknologi | ________________ | ____________ | __________ |
