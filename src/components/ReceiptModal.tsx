import { useEffect } from "react";
import { STORE } from "../data/products";
import { dateLong, formatIDR, timeHM } from "../lib/format";
import type { Transaction } from "../types";
import { IconCheck, IconPrinter, IconX } from "./icons";

interface Props {
  tx: Transaction;
  onClose: () => void;
  closeLabel?: string;
}

function Barcode({ seed }: { seed: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of seed.repeat(2)) {
    const code = ch.charCodeAt(0);
    bars.push({ x, w: (code % 3) + 1 });
    x += (code % 3) + 1 + ((code >> 2) % 2) + 1.4;
  }
  return (
    <svg viewBox={`0 0 ${x} 26`} className="mx-auto mt-3 h-9 w-44" preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="26" fill="#14231C" />
      ))}
    </svg>
  );
}

const Dash = () => <div className="my-2.5 border-t border-dashed border-ink/25" />;

export default function ReceiptModal({ tx, onClose, closeLabel = "Transaksi Baru" }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div className="w-full max-w-sm animate-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Paper */}
        <div className="receipt-area max-h-[78vh] overflow-y-auto rounded-xl bg-card shadow-deep scroll-slim">
          <div className="ticket-edge-top" />
          <div className="px-6 pb-2 pt-1 font-mono text-[12.5px] leading-relaxed text-ink">
            <p className="text-center font-display text-2xl font-black italic tracking-tight">
              {STORE.name}
            </p>
            <p className="text-center text-[11px] text-ink/60">{STORE.address}</p>
            <p className="text-center text-[11px] text-ink/60">Telp {STORE.phone}</p>

            <Dash />
            <div className="flex justify-between text-[11.5px]">
              <span>{tx.invoice}</span>
              <span>{dateLong(tx.timestamp)}</span>
            </div>
            <div className="flex justify-between text-[11.5px] text-ink/70">
              <span>Kasir: {tx.cashier}</span>
              <span>{timeHM(tx.timestamp)} WIB</span>
            </div>
            <Dash />

            <ul className="flex flex-col gap-1.5">
              {tx.lines.map((l, i) => (
                <li key={i}>
                  <p className="font-semibold">{l.name}</p>
                  <div className="flex justify-between text-ink/75">
                    <span>
                      {l.qty} × {formatIDR(l.price)}
                    </span>
                    <span className="tabular">{formatIDR(l.qty * l.price)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <Dash />
            <div className="flex flex-col gap-0.5 text-[12px]">
              <div className="flex justify-between">
                <span>Subtotal ({tx.itemCount} item)</span>
                <span className="tabular">{formatIDR(tx.subtotal)}</span>
              </div>
              {tx.discountAmt > 0 && (
                <div className="flex justify-between">
                  <span>Diskon {tx.discountPct}%</span>
                  <span className="tabular">−{formatIDR(tx.discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>PPN 10%</span>
                <span className="tabular">{formatIDR(tx.tax)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t-2 border-ink py-1 text-[15px] font-bold">
                <span>TOTAL</span>
                <span className="tabular">{formatIDR(tx.total)}</span>
              </div>
            </div>

            <Dash />
            <div className="flex flex-col gap-0.5 text-[12px]">
              <div className="flex justify-between">
                <span>Metode</span>
                <span className="font-bold uppercase">{tx.method}</span>
              </div>
              {tx.cash !== null && (
                <div className="flex justify-between">
                  <span>Tunai</span>
                  <span className="tabular">{formatIDR(tx.cash)}</span>
                </div>
              )}
              {tx.change !== null && (
                <div className="flex justify-between">
                  <span>Kembalian</span>
                  <span className="tabular">{formatIDR(tx.change)}</span>
                </div>
              )}
            </div>

            <Dash />
            <p className="text-center text-[11.5px] font-semibold">
              Terima kasih! Sampai jumpa di senja berikutnya.
            </p>
            <Barcode seed={tx.invoice} />
            <p className="pb-2 text-center text-[10.5px] tracking-[0.25em] text-ink/55">{tx.invoice}</p>
          </div>
          <div className="ticket-edge-bottom" />
        </div>

        {/* Actions */}
        <div className="no-print mt-3 flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-ink shadow-lift transition hover:bg-[#f7b644] active:scale-[0.98]"
          >
            <IconPrinter size={17} />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-milk px-4 py-3 text-sm font-bold text-pine shadow-lift transition hover:bg-white active:scale-[0.98]"
          >
            <IconCheck size={17} strokeWidth={2.6} />
            {closeLabel}
          </button>
        </div>
        <button
          onClick={onClose}
          className="no-print absolute right-4 top-4 hidden"
          aria-label="Tutup"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
