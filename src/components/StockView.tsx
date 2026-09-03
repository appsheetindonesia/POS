import { useMemo } from "react";
import { PRODUCTS } from "../data/products";
import { formatIDR } from "../lib/format";
import type { Transaction } from "../types";
import { IconAlert, IconBox, IconMinus, IconPlus, IconRefresh } from "./icons";

interface Props {
  stockMap: Record<string, number>;
  onSetStock: (id: string, value: number) => void;
  onRestockOne: (id: string) => void;
  onRestockAll: () => void;
  transactions: Transaction[];
}

export default function StockView({ stockMap, onSetStock, onRestockOne, onRestockAll, transactions }: Props) {
  /** Total terjual per produk (dari riwayat; fallback cocokkan nama untuk data lama) */
  const soldMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      for (const l of t.lines) {
        const key = l.productId ?? l.name;
        m.set(key, (m.get(key) ?? 0) + l.qty);
      }
    }
    return m;
  }, [transactions]);

  const rows = PRODUCTS.map((p) => ({
    p,
    stock: stockMap[p.id] ?? 0,
    sold: soldMap.get(p.id) ?? soldMap.get(p.name) ?? 0,
  }));
  const low = rows.filter((r) => r.stock > 0 && r.stock <= 5).length;
  const out = rows.filter((r) => r.stock === 0).length;

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-8">
      {/* Kepala */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black italic text-ink lg:text-3xl">
            Manajemen Stok
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            Stok berkurang otomatis setiap pembayaran berhasil — perubahan tersimpan langsung.
          </p>
        </div>
        <button
          onClick={onRestockAll}
          className="flex items-center gap-2 rounded-stamp bg-gold px-4 py-2.5 text-sm font-bold text-ink shadow-lift transition hover:bg-[#f7b644] active:scale-[0.97]"
        >
          <IconRefresh size={16} strokeWidth={2.4} />
          Isi Ulang Semua
        </button>
      </div>

      {/* Strip ringkasan */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border-2 border-ink/8 bg-card px-5 py-3.5 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink/70">
          <IconBox size={16} className="text-pine" />
          <b className="font-mono text-base text-ink tabular">{rows.length}</b> SKU terdaftar
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-gold-deep">
          <IconAlert size={16} />
          <b className="font-mono text-base tabular">{low}</b> menipis (≤ 5)
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-tomato">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-tomato" />
          <b className="font-mono text-base tabular">{out}</b> habis
        </span>
        <span className="ml-auto hidden text-xs font-semibold text-mist sm:block">
          Klik angka stok untuk mengetik langsung
        </span>
      </div>

      {/* Daftar stok */}
      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map(({ p, stock, sold }, i) => {
          const soldOut = stock === 0;
          const lowStock = !soldOut && stock <= 5;
          return (
            <li
              key={p.id}
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              className={`flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-3 rounded-card border-2 bg-card p-3 shadow-sm transition-colors ${
                soldOut
                  ? "border-tomato/40"
                  : lowStock
                    ? "border-gold/60"
                    : "border-ink/8"
              }`}
            >
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                className={`h-14 w-14 shrink-0 rounded-xl object-cover shadow-sm ${soldOut ? "opacity-50 grayscale" : ""}`}
              />

              <div className="min-w-[150px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-ink">{p.name}</p>
                  <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/55">
                    {p.category}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-xs font-semibold text-pine tabular">
                  {formatIDR(p.price)}
                </p>
              </div>

              <div className="hidden text-center sm:block">
                <p className="font-mono text-base font-bold text-ink tabular">{sold}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-mist">terjual</p>
              </div>

              {/* Stepper stok */}
              <div className="flex items-center gap-1 rounded-full border-2 border-ink/10 bg-paper p-1">
                <button
                  onClick={() => onSetStock(p.id, Math.max(0, stock - 1))}
                  disabled={soldOut}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition enabled:hover:bg-tomato/15 enabled:hover:text-tomato enabled:active:scale-90 disabled:opacity-25"
                  aria-label={`Kurangi stok ${p.name}`}
                >
                  <IconMinus size={14} strokeWidth={2.6} />
                </button>
                <input
                  value={stock}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
                    onSetStock(p.id, Number.isFinite(n) ? Math.min(999, n) : 0);
                  }}
                  inputMode="numeric"
                  className="w-12 bg-transparent text-center font-mono text-sm font-bold text-ink outline-none tabular"
                  aria-label={`Stok ${p.name}`}
                />
                <button
                  onClick={() => onSetStock(p.id, Math.min(999, stock + 1))}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-pine hover:text-milk active:scale-90"
                  aria-label={`Tambah stok ${p.name}`}
                >
                  <IconPlus size={14} strokeWidth={2.6} />
                </button>
              </div>

              <button
                onClick={() => onRestockOne(p.id)}
                title={`Isi ulang ke ${p.stock} (stok awal)`}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 text-ink/50 transition hover:border-pine hover:bg-pine hover:text-milk active:scale-90"
                aria-label={`Isi ulang ${p.name}`}
              >
                <IconRefresh size={15} />
              </button>

              <span
                className={`w-20 rounded-full px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wide ${
                  soldOut
                    ? "bg-tomato text-milk"
                    : lowStock
                      ? "bg-gold text-ink"
                      : "bg-pine/12 text-pine"
                }`}
              >
                {soldOut ? "Habis" : lowStock ? "Menipis" : "Aman"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-xs text-mist">
        “Isi Ulang Semua” & pengaturan lanjut dilindungi PIN manajer.
      </p>
    </div>
  );
}
