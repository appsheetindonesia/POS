-- LWW sinkronisasi: log penghapusan (tombstone).
-- Setiap DELETE yang diterima dari perangkat dicatat agar perangkat lain
-- tidak menghidupkan kembali data yang sudah dihapus saat merge.

CREATE TABLE IF NOT EXISTS pos_deletions (
  entity     TEXT NOT NULL,           -- transactions | shifts | heldOrders | stock
  key        TEXT NOT NULL,
  deleted_at BIGINT NOT NULL,         -- epoch ms dari perangkat penghapus
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, key)
);

CREATE INDEX IF NOT EXISTS idx_pos_deletions_deleted_at
  ON pos_deletions (deleted_at);
