-- Skema awal Kopi Senja POS.
-- Entitas disimpan sebagai JSONB agar sinkronisasi tahan perubahan skema domain
-- (mis. kolom void/shift baru di versi berikutnya) tanpa migrasi kolom per-ubah.

CREATE TABLE IF NOT EXISTS pos_transactions (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_stock (
  product_id TEXT PRIMARY KEY,
  qty        INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_shifts (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_held_orders (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_meta (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index bantu untuk laporan (mis. filter transaksi per hari)
CREATE INDEX IF NOT EXISTS idx_pos_transactions_updated
  ON pos_transactions (updated_at DESC);