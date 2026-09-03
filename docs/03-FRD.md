# FRD — Functional Requirements Document

## Aplikasi Kasir (POS) "Kopi Senja"

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Mengacu pada** | PRD v1.0 (F-01 s.d. F-11) |
| **Konvensi penomoran** | `FR-xx` kebutuhan fungsional · `FR-xx.y` aturan turunan |

---

## FR-01 · Katalog Menu

**Deskripsi:** Menampilkan seluruh menu aktif sebagai kartu berfoto yang dapat diklik untuk menambah item ke pesanan.

| # | Aturan |
|---|---|
| FR-01.1 | Katalog memuat **10 menu** dalam 4 kategori: Kopi (3), Non-Kopi (3), Makanan (2), Camilan (2). Sumber data tunggal: `src/data/products.ts`. |
| FR-01.2 | Setiap kartu menampilkan: foto produk (1:1, `object-cover`), chip kategori, badge **"★ Terlaris"** bila `popular: true`, nama, deskripsi (1 baris, terpotong ellipsis), harga format `Rp xx.xxx`, dan tombol tambah `+`. |
| FR-01.3 | Klik di area kartu mana pun = tambah 1 qty (setara menekan tombol `+`). |
| FR-01.4 | Bila item sudah ada di keranjang, kartu menampilkan badge `×n` yang beranimasi setiap kali qty berubah. |
| FR-01.5 | Foto dimuat `lazy`; tampil *shimmer* hingga `onLoad`; bila `onError`, kartu beralih ke **fallback emoji** berwarna sesuai kategori. |

## FR-02 · Pencarian & Filter Kategori

| # | Aturan |
|---|---|
| FR-02.1 | Kotak pencarian memfilter **nama dan deskripsi**, case-insensitive, terhadap substring kueri yang sudah di-trim. |
| FR-02.2 | Chip kategori: `Semua` + 4 kategori, masing-masing menampilkan jumlah menu. Hanya satu chip aktif; default `Semua`. |
| FR-02.3 | Filter kategori dan pencarian berlaku **bersamaan** (AND). |
| FR-02.4 | Bila hasil 0 → state kosong: pesan "Tidak ada menu cocok" berisi kueri & kategori aktif, plus tombol "Atur ulang filter" yang mengosongkan keduanya. |
| FR-02.5 | Ikon ✕ di dalam kotak pencarian muncul saat kueri tidak kosong; klik = bersihkan kueri. |

## FR-03 · Keranjang (Panel Pesanan)

| # | Aturan |
|---|---|
| FR-03.1 | Item direpresentasikan unik per `productId`; menambah item yang sudah ada menaikkan qty, bukan menambah baris baru. |
| FR-03.2 | Baris item menampilkan: thumbnail foto (fallback emoji), nama, harga satuan, stepper qty, subtotal baris, tombol hapus baris. |
| FR-03.3 | Stepper `−` mengurangi 1 qty; bila qty mencapai **0**, baris **otomatis dihapus** (tidak ada baris qty 0). |
| FR-03.4 | Tidak ada batas atas qty (kebijakan bisnis: pesanan grup besar sah). |
| FR-03.5 | "Kosongkan" menghapus seluruh baris **dan** mereset diskon ke 0%; tombol nonaktif saat keranjang kosong; tidak ada dialog konfirmasi (undo via toast tidak tersedia di v1 — disengaja demi kecepatan kasir). |
| FR-03.6 | Keranjang kosong menampilkan state ilustrasi cangkir + teks panduan. |
| FR-03.7 | Header panel menampilkan badge total item (Σ qty semua baris). |

## FR-04 · Diskon Persentase

| # | Aturan |
|---|---|
| FR-04.1 | Diskon berupa **persentase atas subtotal**, bukan nominal. |
| FR-04.2 | Stepper mengubah nilai dalam kelipatan **5%**, rentang **0–100%** (nilai di luar rentang di-clamp). |
| FR-04.3 | Diskon tersimpan bersama transaksi (`discountPct`, `discountAmt`) dan tercetak di struk hanya bila > 0. |
| FR-04.4 | Diskon di-reset ke 0% saat keranjang dikosongkan (FR-03.5) dan setelah transaksi selesai (FR-05.6). |

## FR-05 · Perhitungan & Pembayaran

### FR-05.A · Rumus Perhitungan (wajib eksak)

Seluruh nilai dalam **integer rupiah**; satu-satunya pembulatan adalah `Math.round` pada hasil perkalian pecahan:

```
subtotal    = Σ (harga_i × qty_i)
discountAmt = round(subtotal × discountPct / 100)
tax         = round((subtotal − discountAmt) × 0,10)      // PPN 10%
total       = subtotal − discountAmt + tax
kembalian   = uangTunai − total                            // hanya metode Tunai
```

- Urutan: diskon dipotong **sebelum** pajak (pajak dikenakan atas nilai setelah diskon).
- `total ≥ 0` selalu berlaku karena `discountPct ≤ 100`.

### FR-05.B · Modal Pembayaran

| # | Aturan |
|---|---|
| FR-05.1 | Modal terbuka via tombol "Bayar" (panel kanan / drawer mobile) dan **hanya bila keranjang tidak kosong**. |
| FR-05.2 | Header modal menampilkan ringkasan `n item` dan **total jatuh tempo** yang selalu konsisten dengan panel. |
| FR-05.3 | Tiga tab metode: **Tunai** (default), **QRIS**, **Kartu Debit**. Pindah tab tidak mengubah pesanan. |
| FR-05.4 | `Esc` menutup modal (setara batal, tanpa menyimpan apa pun). |

### FR-05.C · Metode Tunai

| # | Aturan |
|---|---|
| FR-05.5 | Chip **uang cepat**: *Uang Pas* (= total), Rp 10.000, 20.000, 50.000, 100.000. Nominal < total tetap dapat dipilih (kasir melanjutkan via keypad); chip "Uang Pas" otomatis tepat. |
| FR-05.6 | Keypad 0–9 menambah digit (maks. 9 digit, digit terdepan nol diabaikan); `⌫` menghapus digit terakhir; "C" mengosongkan. |
| FR-05.7 | Validasi: bila `uang < total` → tombol konfirmasi **nonaktif** + pesan merah *"Kurang Rp X"*. |
| FR-05.8 | Bila valid → preview **"Kembalian: Rp X"** tampil sebelum konfirmasi. |
| FR-05.9 | Konfirmasi sukses → fase *sukses*: angka kembalian besar + animasi pop, lalu otomatis membuka struk. |

### FR-05.D · Metode QRIS

| # | Aturan |
|---|---|
| FR-05.10 | Menampilkan **kode QR statis merchant** (NMID `ID2026KOPISENJA`) beserta nilai tagihan. |
| FR-05.11 | Kasir wajib menekan *"Pelanggan sudah scan & bayar"* sebelum tombol "Konfirmasi Pembayaran" aktif (ceklist manual menggantikan verifikasi server di v1). |

### FR-05.E · Metode Kartu Debit

| # | Aturan |
|---|---|
| FR-05.12 | Menampilkan alur EDC 3 langkah (Gesek/Chip → PIN → Sukses) dan nilai tagihan. |
| FR-05.13 | Konfirmasi menandakan struk EDC berhasil; tombol aktif segera (EDC fisik memvalidasi). |

### FR-05.F · Pasca-Konfirmasi (semua metode)

| # | Aturan |
|---|---|
| FR-05.14 | Sistem membuat objek `Transaction` (skema TRD §3), menomornya `SJA-xxxx` dari sekuen naik, lalu menyimpannya **di depan** daftar riwayat. |
| FR-05.15 | Keranjang dikosongkan, diskon di-reset, sekuen nota +1, toast sukses tampil. |
| FR-05.16 | `cash`/`change` terisi hanya untuk metode Tunai; metode lain bernilai `null`. |

## FR-06 · Struk Digital & Cetak

| # | Aturan |
|---|---|
| FR-06.1 | Struk tampil sebagai modal berlapis kertas (tepi perforasi atas–bawah), lebar setara struk thermal (≈340 px). |
| FR-06.2 | Konten wajib: identitas kedai (nama, alamat, telepon) · nomor nota · tanggal panjang + jam WIB · nama kasir · rincian per baris (`qty × harga = subtotal`) · jumlah item · subtotal · diskon (bila ada) · PPN 10% · **TOTAL** · metode · tunai/kembalian (bila tunai) · ucapan terima kasih · barcode dekoratif + nomor nota. |
| FR-06.3 | "Cetak Struk" memanggil `window.print()`; CSS `@media print` menyembunyikan seluruh UI kecuali `.receipt-area`. |
| FR-06.4 | Tombol sekunder "Transaksi Baru" menutup struk dan mengembalikan fokus ke katalog. |
| FR-06.5 | Bila dibuka dari Riwayat, tombol sekunder berbunyi **"Tutup"** (mode lihat-saja, tidak ada aksi transaksi). |

## FR-07 · Riwayat & Ringkasan Harian

| # | Aturan |
|---|---|
| FR-07.1 | Riwayat menyimpan **maksimum 200 transaksi terakhir** (FIFO terbalik: terbaru di depan; yang terlama dibuang saat melewati batas). |
| FR-07.2 | Kartu statistik **hari berjalan**: omzet, jumlah transaksi, item terjual, rata-rata/transaksi. Nilai nol saat belum ada transaksi. |
| FR-07.3 | Grafik batang omzet per jam rentang **07.00–21.00**; batang hari berjalan disorot warna emas; tooltip menampilkan nilai saat hover. |
| FR-07.4 | Daftar transaksi: nomor nota, waktu, metode, jumlah item, total; baris dapat diklik → membuka struk lihat-saja (FR-06.5). |
| FR-07.5 | "Hapus Riwayat" membersihkan seluruh data transaksi **setelah konfirmasi inline dua langkah** (tombol berubah menjadi "Yakin? Klik lagi"), dan **tidak** memengaruhi nomor sekuen nota. |
| FR-07.6 | State kosong menampilkan ilustrasi + ajakan kembali ke tab Kasir. |

## FR-08 · Persistensi Data

| # | Aturan |
|---|---|
| FR-08.1 | Tiga kunci `localStorage`: `senja-pos:cart`, `senja-pos:transactions`, `senja-pos:seq`. |
| FR-08.2 | Setiap perubahan state terkait ditulis seketika (`useEffect` sinkronisasi). |
| FR-08.3 | Pembacaan awal toleran terhadap data korup/tidak ada → jatuh ke nilai default (`[]`, `[]`, `1`). |
| FR-08.4 | Gagal tulis (mode privat/kuota penuh) ditelan tanpa crash; aplikasi tetap berjalan dalam mode non-persisten. |

## FR-09 · Notifikasi (Toast)

| # | Aturan |
|---|---|
| FR-09.1 | Maksimal **3 toast** bersamaan (yang tertua tergeser); tiap toast hidup **2,4 detik** lalu lenyap. |
| FR-09.2 | Tiga nada: `success` (hijau, item masuk / bayar sukses), `info` (keranjang dikosongkan), `warn` (item dihapus). |
| FR-09.3 | Toast tidak memblokir interaksi apa pun (non-modal). |

## FR-10 · Navigasi & Responsivitas

| # | Aturan |
|---|---|
| FR-10.1 | Header memuat logo, nama kedai, jam digital berjalan (HH.MM.SS), dan switch tampilan **Kasir / Riwayat**. |
| FR-10.2 | ≥ `lg`: panel pesanan menetap di kolom kanan. < `lg`: panel menjadi **drawer** dari kanan, dipanggil lewat tombol mengambang berisi badge jumlah item; selubung gelap menutup saat terbuka. |
| FR-10.3 | Grid produk: 2 kolom (ponsel) → 3 (tablet) → 4 (desktop lebar ≥ 2xl). |
| FR-10.4 | Tombol "Bayar" selalu terjangkau: dasar panel kanan (desktop) dan dasar drawer (mobile). |

## FR-11 · Penanganan Kesalahan Umum

| Kasus | Perilaku |
|---|---|
| Foto produk gagal dimuat | Fallback emoji (FR-01.5) |
| Item di keranjang tak ada lagi di katalog | Dihitung Rp 0, baris tetap tampil (defensif, tidak terjadi selama data statis) |
| `Esc` saat modal bayar terbuka | Batal tanpa efek samping (FR-05.4) |
| Klik selubung modal | Menutup modal (batal) |
| localStorage tidak tersedia | Aplikasi berfungsi penuh, tanpa persistensi (FR-08.4) |
