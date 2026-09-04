import { useState } from "react";
import type { Shift } from "../types";
import { formatIDR } from "../lib/format";

interface Props {
  shift: Shift | null;
  onOpen: (openingFloat: number) => void;
  onClose: (closingFloat: number) => void;
}

export default function ShiftPanel({ shift, onOpen, onClose }: Props) {
  const [float, setFloat] = useState("");
  const [closingFloat, setClosingFloat] = useState("");
  const [showClose, setShowClose] = useState(false);

  if (!shift) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-panel border-2 border-ink/10 bg-card p-6 text-center shadow-deep">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-stamp bg-gold text-3xl" aria-hidden>
            🕐
          </span>
          <h2 className="mt-3 font-display text-xl font-black italic text-ink">
            Buka Shift Baru
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            Masukkan modal awal kas sebelum mulai berjualan.
          </p>
          <div className="mt-4 text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-mist">
              Modal Awal (Rp)
            </label>
            <input
              type="number"
              min={0}
              value={float}
              onChange={(e) => setFloat(e.target.value)}
              placeholder="500000"
              className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-paper px-3 py-2.5 font-mono text-lg font-bold text-ink outline-none transition focus:border-pine"
            />
          </div>
          <button
            onClick={() => {
              const n = parseInt(float, 10);
              if (n >= 0 && !isNaN(n)) onOpen(n);
            }}
            disabled={float === "" || parseInt(float, 10) < 0 || isNaN(parseInt(float, 10))}
            className="mt-4 w-full rounded-stamp bg-pine px-4 py-3 text-sm font-bold text-milk transition hover:bg-pine-deep disabled:opacity-40"
          >
            Buka Shift
          </button>
        </div>
      </div>
    );
  }

  if (showClose) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-panel border-2 border-ink/10 bg-card p-6 text-center shadow-deep">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-stamp bg-tomato text-3xl" aria-hidden>
            📋
          </span>
          <h2 className="mt-3 font-display text-xl font-black italic text-ink">
            Tutup Shift
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            Hitung uang di kas lalu masukkan jumlahnya.
          </p>
          <div className="mt-3 rounded-xl bg-ink/5 p-3 text-left text-sm text-ink/70">
            <p>Modal: <span className="font-bold text-ink">{formatIDR(shift.openingFloat)}</span></p>
            <p>Total tunai: <span className="font-bold text-ink">{formatIDR(shift.cashTotal)}</span></p>
            <p>Expected: <span className="font-bold text-ink">{formatIDR(shift.openingFloat + shift.cashTotal)}</span></p>
          </div>
          <div className="mt-4 text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-mist">
              Uang di Kas (Rp)
            </label>
            <input
              type="number"
              min={0}
              value={closingFloat}
              onChange={(e) => setClosingFloat(e.target.value)}
              placeholder={String(shift.openingFloat + shift.cashTotal)}
              className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-paper px-3 py-2.5 font-mono text-lg font-bold text-ink outline-none transition focus:border-pine"
            />
          </div>
          <button
            onClick={() => {
              const n = parseInt(closingFloat, 10);
              if (!isNaN(n)) {
                onClose(n);
                setShowClose(false);
              }
            }}
            disabled={closingFloat === "" || isNaN(parseInt(closingFloat, 10))}
            className="mt-4 w-full rounded-stamp bg-tomato px-4 py-3 text-sm font-bold text-milk transition hover:bg-tomato-deep disabled:opacity-40"
          >
            Tutup Shift
          </button>
          <button
            onClick={() => setShowClose(false)}
            className="mt-2 w-full rounded-stamp border-2 border-ink/10 bg-card px-4 py-2 text-sm font-bold text-ink/55 transition hover:bg-ink/5"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-pine/30 bg-pine/8 px-3 py-1.5 text-xs text-pine">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-pine" />
      </span>
      <span className="font-semibold">{shift.cashierName}</span>
      <span className="text-ink/40">·</span>
      <span className="font-mono font-bold tabular">{formatIDR(shift.openingFloat)}</span>
      <span className="text-ink/40">·</span>
      <span>{shift.txCount} tx</span>
      <button
        onClick={() => setShowClose(true)}
        className="ml-1 rounded-full bg-tomato/10 px-2 py-0.5 text-[10px] font-bold uppercase text-tomato transition hover:bg-tomato/20"
      >
        Tutup
      </button>
    </div>
  );
}
