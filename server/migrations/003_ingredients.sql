-- Bahan baku (satu sumber kebenaran stok menu ber-resep).
-- LWW per ingredient id melalui kolom updated_at (epoch ms dari perangkat).

CREATE TABLE IF NOT EXISTS pos_ingredients (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
