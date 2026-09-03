import { useState } from "react";
import { PRODUCT_MAP } from "../data/products";
import { formatIDR } from "../lib/format";
import type { CartItem, Totals } from "../types";
import { IconArrowRight, IconBroom, IconMinus, IconPlus, IconTrash } from "./icons";

/** Thumbnail foto di daftar pesanan, fallback emoji bila gagal dimuat */
function CartThumb({ image, emoji, name }: { image: string; emoji: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-milk/8 text-xl" aria-hidden>
        {emoji}
      </span>
    );
  }
  return (
    <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-milk/8 ring-1 ring-milk/15">
      <img
        src={image}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

interface Props {
  items: CartItem[];
  totals: Totals;
  discountPct: number;
  onDiscountPct: (n: number) => void;
  onQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onPay: () => void;
}

export default function CartPanel({
  items,
  totals,
  discountPct,
  onDiscountPct,
  onQty,
  onRemove,
  onClear,
  onPay,
}: Props) {
  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  const empty = items.length === 0;

  return (
    <div className="panel-texture flex h-full min-h-0 flex-col rounded-none bg-pine-deep text-milk lg:rounded-3xl lg:border lg:border-ink/30 lg:shadow-deep">
      {/* Head */}
      <div className="flex items-center justify-between border-b border-milk/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-lg font-bold italic">Pesanan</h2>
          <span
            key={itemCount}
            className="grid h-6 min-w-6 animate-badge place-items-center rounded-full bg-gold px-1.5 font-mono text-xs font-bold text-ink"
          >
            {itemCount}
          </span>
        </div>
        <button
          onClick={onClear}
          disabled={empty}
          className="flex items-center gap-1.5 rounded-full border border-milk/15 px-3 py-1.5 text-xs font-semibold text-milk/60 transition enabled:hover:border-tomato/60 enabled:hover:bg-tomato/15 enabled:hover:text-milk disabled:opacity-30"
        >
          <IconBroom size={13} />
          Kosongkan
        </button>
      </div>

      {/* Items */}
      <div className="scroll-dark min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <svg width="88" height="88" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path
                d="M8 14h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-5zm13 1.5h2a3 3 0 0 1 0 6h-2"
                stroke="#F0A82D"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path d="M12 6c-1 1.2-1 2.1.2 3.2M17 6c-1 1.2-1 2.1.2 3.2" stroke="#F5F1E4" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
            </svg>
            <p className="mt-3 font-display text-base font-bold text-milk/80">Belum ada pesanan</p>
            <p className="mt-1 max-w-[190px] text-xs leading-relaxed text-milk/45">
              Ketuk menu di sebelah kiri untuk menambahkan ke pesanan.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((it) => {
              const p = PRODUCT_MAP[it.productId];
              if (!p) return null;
              return (
                <li
                  key={it.productId}
                  className="group animate-drop rounded-2xl border border-milk/8 bg-ink/25 p-3 transition-colors hover:border-milk/20 hover:bg-ink/40"
                >
                  <div className="flex items-start gap-3">
                    <CartThumb image={p.image} emoji={p.emoji} name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold leading-snug">{p.name}</p>
                        <button
                          onClick={() => onRemove(it.productId)}
                          className="shrink-0 rounded-md p-1 text-milk/35 transition hover:bg-tomato/25 hover:text-tomato"
                          aria-label={`Hapus ${p.name}`}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-milk/45 tabular">
                        @ {formatIDR(p.price)}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-full border border-milk/12 bg-ink/30 p-0.5">
                          <button
                            onClick={() => onQty(it.productId, -1)}
                            className="grid h-6 w-6 place-items-center rounded-full text-milk/70 transition hover:bg-milk/10 hover:text-milk active:scale-90"
                            aria-label="Kurangi"
                          >
                            <IconMinus size={13} strokeWidth={2.6} />
                          </button>
                          <span
                            key={it.qty}
                            className="w-6 animate-badge text-center font-mono text-sm font-bold text-gold tabular"
                          >
                            {it.qty}
                          </span>
                          <button
                            onClick={() => onQty(it.productId, 1)}
                            className="grid h-6 w-6 place-items-center rounded-full text-milk/70 transition hover:bg-gold hover:text-ink active:scale-90"
                            aria-label="Tambah"
                          >
                            <IconPlus size={13} strokeWidth={2.6} />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-bold tabular">
                          {formatIDR(p.price * it.qty)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-milk/15 px-5 pb-5 pt-4">
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-milk/60">
            <dt>Subtotal</dt>
            <dd className="font-mono tabular">{formatIDR(totals.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 text-milk/60">
            <dt className="flex items-center gap-2">
              Diskon
              <span className="flex items-center gap-1 rounded-full border border-milk/12 bg-ink/30 p-0.5">
                <button
                  onClick={() => onDiscountPct(Math.max(0, discountPct - 5))}
                  className="grid h-5 w-5 place-items-center rounded-full text-milk/60 transition hover:bg-milk/10 disabled:opacity-30"
                  disabled={discountPct <= 0}
                  aria-label="Kurangi diskon"
                >
                  <IconMinus size={11} />
                </button>
                <span className="w-7 text-center font-mono text-xs font-bold text-gold tabular">{discountPct}%</span>
                <button
                  onClick={() => onDiscountPct(Math.min(100, discountPct + 5))}
                  className="grid h-5 w-5 place-items-center rounded-full text-milk/60 transition hover:bg-gold hover:text-ink"
                  aria-label="Tambah diskon"
                >
                  <IconPlus size={11} />
                </button>
              </span>
            </dt>
            <dd className={`font-mono tabular ${totals.discountAmt > 0 ? "text-gold" : ""}`}>
              −{formatIDR(totals.discountAmt)}
            </dd>
          </div>
          <div className="flex justify-between text-milk/60">
            <dt>PPN 10%</dt>
            <dd className="font-mono tabular">{formatIDR(totals.tax)}</dd>
          </div>
        </dl>

        <div className="mt-3 border-t-2 border-dashed border-milk/15 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-milk/55">Total</span>
            <span className="font-mono text-[26px] font-bold leading-none text-gold tabular">
              {formatIDR(totals.total)}
            </span>
          </div>
        </div>

        <button
          onClick={onPay}
          disabled={empty}
          className="group mt-4 flex w-full items-center justify-between rounded-2xl bg-gold px-5 py-3.5 font-bold text-ink shadow-lift transition-all duration-200 enabled:hover:bg-[#f7b644] enabled:hover:shadow-deep enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="flex items-center gap-2">
            Bayar
            <span className="hidden font-mono text-sm font-semibold text-ink/70 sm:inline tabular">
              {formatIDR(totals.total)}
            </span>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-gold transition-transform duration-200 group-enabled:group-hover:translate-x-1">
            <IconArrowRight size={16} strokeWidth={2.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
