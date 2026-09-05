# Panduan Deploy PostgreSQL — Easypanel

Aplikasi Kopi Senja POS menyimpan data di localStorage secara default. Untuk
pencadangan lintas perangkat, aktifkan mode **PostgreSQL** dari menu
**Pengaturan → Database PostgreSQL** di aplikasi.

Browser tidak bisa konek langsung ke Postgres, jadi dibutuhkan service API
(`server/`) yang bertindak sebagai jembatan.

## 1. Setup PostgreSQL di Easypanel

1. Easypanel → **New Project** → **PostgreSQL** template.
2. Catat: host, port (5432), database, username, password.
3. (Opsional) Buat database khusus: `CREATE DATABASE pos_db;`

## 2. Deploy service API

1. Easypanel → service baru → Builder: **Dockerfile**.
2. Build Context: `server/` (folder yang berisi `Dockerfile`).
3. Port: `3000`.
4. Environment Variables:

```
DATABASE_URL=postgresql://postgres:password@host:5432/pos_db?sslmode=disable
PORT=3000
```

5. **Save → Deploy**. Tabel dibuat otomatis (auto-migration) saat pertama konek.

## 3. Hubungkan aplikasi

Dua cara:

**A. Satu domain (disarankan)** — balik proxy menunjuk `/api` ke service API.
Aplikasi memakai origin yang sama, tanpa konfigurasi tambahan.

**B. Service terpisah** — di aplikasi, set env build `VITE_API_URL`
(mis. `https://api.pos.example.com`). Form "Tempel DATABASE_URL" di menu
Pengaturan → Database PostgreSQL mengisi field koneksi otomatis.

## 4. Uji

1. Buka aplikasi → **Pengaturan → Database PostgreSQL**.
2. Pilih mode **PostgreSQL (server)**, isi form (atau tempel `DATABASE_URL`).
3. **Uji Koneksi** — pesan ramah berbahasa Indonesia bila gagal
   (host tidak ditemukan, koneksi ditolak, timeout, password salah, dll).
4. **Simpan & Aktifkan** — lalu **Sinkronkan Sekarang**.
5. Perangkat baru dengan riwayat lokal kosong otomatis memulihkan data dari server.

## Catatan versi 1

- Sinkronisasi bersifat seluruh-dataset (push menimpa server, pull menimpa lokal).
  Belum ada resolusi konflik antar-perangkat yang sama-sama aktif.
- Tabel menyimpan entitas sebagai JSONB agar tahan perubahan skema domain.